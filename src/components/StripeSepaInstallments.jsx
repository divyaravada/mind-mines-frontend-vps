// src/components/StripeSepaInstallments.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import { useStripeSepaInstallmentsMutation } from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";
import http from "../services/http";

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

/**
 * Inner piece that:
 *  - shows PaymentElement (after we have SetupIntent client_secret)
 *  - confirms mandate with stripe.confirmSetup
 *  - then triggers backend to start installments and create the Order
 */
function SepaInstallmentsInner({
  months,
  countryCode,
  form,
  items,
  couponCode,
  onCreated,
  setErrorMsg,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [startPlan, { isLoading }] = useStripeSepaInstallmentsMutation();
  const [busy, setBusy] = useState(false);

  const startInstallments = useCallback(
    async (paymentMethodId) => {
      // create Order + schedule on backend
      const payload = buildOrderPayload({
        form,
        items,
        email: form.email,
        couponCode,
        payment_method: "sepa_installments",
        extra: {
          months,
          payment_method_id: paymentMethodId,
          country: (countryCode || "DE").toUpperCase(),
        },
      });

      const res = await startPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");
      onCreated?.(orderId);
    },
    [startPlan, months, countryCode, form, items, couponCode, onCreated]
  );

  const confirmMandateThenCreate = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setErrorMsg("");

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });

      if (error) {
        setErrorMsg(error.message || "Mandate confirmation failed.");
        setBusy(false);
        return;
      }

      const pmId = setupIntent?.payment_method;
      if (!pmId) {
        setErrorMsg("No payment method was created.");
        setBusy(false);
        return;
      }

      await startInstallments(pmId);
    } catch (e) {
      setErrorMsg(pickErr(e, "Failed to confirm mandate."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <button
        disabled={busy || isLoading || !stripe || !elements}
        onClick={confirmMandateThenCreate}
        className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
      >
        {busy || isLoading
          ? "Processing…"
          : `Confirm mandate & start ${months} mo.`}
      </button>
      <p className="text-xs text-gray-500">
        By confirming, you authorize monthly SEPA debits for {months} months.
      </p>
    </div>
  );
}

/**
 * Public component used by checkout.jsx
 * - If `paymentMethodId` is already provided: we skip mandate collection and directly create the plan.
 * - Else: we request a SetupIntent, render <Elements> only after client_secret arrives, confirm mandate, then create plan.
 */
export default function StripeSepaInstallments({
  active,
  setActive, // not used, but keep API
  months,
  form,
  items,
  couponCode,
  paymentMethodId, // optional saved mandate PM id
  countryCode,
  setLocalOrderId,
  onSuccess,
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const monthsSafe = useMemo(() => {
    const m = Number(months);
    return [3, 6, 9].includes(m) ? m : 3;
  }, [months]);

  const [clientSecret, setClientSecret] = useState("");
  const [loadingInit, setLoadingInit] = useState(false);

  // If we already have a saved payment method, we can start the plan without showing PaymentElement
  const [startPlanDirect, { isLoading: creatingPlanDirect }] =
    useStripeSepaInstallmentsMutation();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!active) return;
      setErrorMsg("");

      // Case 1: Existing saved mandate -> create plan directly
      if (paymentMethodId) return;

      // Case 2: Need to collect mandate -> create SetupIntent, store client_secret
      setLoadingInit(true);
      try {
        const r = await http.post("stripe/setup-intent/sepa/", {
          email: (form.email || "").trim(),
        });
        const cs =
          r?.data?.client_secret ||
          r?.client_secret ||
          r?.data?.data?.client_secret ||
          "";
        if (!cs) throw new Error("Missing SetupIntent client_secret.");

        if (!cancelled) setClientSecret(cs);
      } catch (e) {
        if (!cancelled)
          setErrorMsg(pickErr(e, "Failed to prepare SEPA mandate."));
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [active, paymentMethodId, form?.email]);

  // If a saved payment method exists, let the shopper start the plan immediately
  const startWithSavedPM = async () => {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: form.email,
        couponCode,
        payment_method: "sepa_installments",
        extra: {
          months: monthsSafe,
          payment_method_id: paymentMethodId,
          country: (countryCode || "DE").toUpperCase(),
        },
      });
      const res = await startPlanDirect(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");
      setLocalOrderId?.(orderId);
      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(pickErr(e, "Failed to start SEPA plan."));
    }
  };

  if (!active) {
    return (
      <div className="border rounded p-3 mt-3">
        <div className="text-sm text-gray-600">
          0% Finanzierung (SEPA Lastschrift) — {monthsSafe} Monate
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-2">
      <div className="text-sm">
        SEPA Ratenzahlung ({monthsSafe} Monate). Abbuchung monatlich.
      </div>

      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

      {/* Saved PM path */}
      {paymentMethodId ? (
        <button
          disabled={creatingPlanDirect}
          onClick={startWithSavedPM}
          className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
        >
          {creatingPlanDirect
            ? "Starte…"
            : "Ratenzahlung starten (gespeicherte SEPA-Mandat)"}
        </button>
      ) : (
        <>
          {/* We only render Elements AFTER we have a clientSecret to avoid the IntegrationError */}
          {loadingInit && (
            <div className="text-sm text-gray-600">Vorbereiten…</div>
          )}

          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
                locale: "de",
              }}
            >
              <SepaInstallmentsInner
                months={monthsSafe}
                countryCode={countryCode}
                form={form}
                items={items}
                couponCode={couponCode}
                setErrorMsg={setErrorMsg}
                onCreated={(orderId) => {
                  setLocalOrderId?.(orderId);
                  onSuccess?.(orderId);
                }}
              />
            </Elements>
          )}
        </>
      )}
    </div>
  );
}
