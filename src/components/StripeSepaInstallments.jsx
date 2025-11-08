// src/components/StripeSepaInstallments.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import InstallmentsSchedulePreview from "./InstallmentsSchedulePreview";
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

const pickErr = (e, fb) =>
  e?.data?.detail ||
  e?.data?.error ||
  e?.error ||
  (typeof e === "string" ? e : "") ||
  fb;

function SepaInstallmentsInner({
  months,
  countryCode,
  form,
  items,
  couponCode,
  onCreated,
  setErrorMsg,
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [startPlan, { isLoading }] = useStripeSepaInstallmentsMutation();
  const [busy, setBusy] = useState(false);

  const monthsSafe = useMemo(
    () => ([3, 6, 9].includes(Number(months)) ? Number(months) : 3),
    [months]
  );

  const startInstallments = useCallback(
    async (pmId) => {
      const payload = buildOrderPayload({
        form,
        items,
        email: form.email,
        couponCode,
        payment_method: "sepa_installments",
        installments_months: monthsSafe,
        extra: {
          months: monthsSafe,
          payment_method_id: pmId,
          country: (countryCode || "DE").toUpperCase(),
        },
      });
      const res = await startPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error(t("checkout.sepaInstallments.orderMissing"));
      onCreated?.(orderId, {
        months: res?.months,
        amounts: res?.amounts,
        dates: res?.dates,
      });
    },
    [startPlan, monthsSafe, countryCode, form, items, couponCode, onCreated]
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
      if (error)
        throw new Error(error.message || t("checkout.sepaInstallments.mandateFailed"));
      const pmId = setupIntent?.payment_method;
      if (!pmId) throw new Error(t("checkout.sepaInstallments.noPaymentMethod"));
      await startInstallments(pmId);
    } catch (e) {
      setErrorMsg(pickErr(e, t("checkout.sepaInstallments.mandateFailed")));
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
          : `Confirm mandate & start ${monthsSafe} mo.`}
      </button>
      <p className="text-xs text-gray-500">
        {t("checkout.sepaInstallments.notice", { months: monthsSafe })}
      </p>
    </div>
  );
}

export default function StripeSepaInstallments({
  active,
  months,
  form,
  items,
  couponCode,
  paymentMethodId,
  countryCode,
  setLocalOrderId,
  onSuccess,
}) {
  const { t } = useTranslation();
  const [errorMsg, setErrorMsg] = useState("");
  const monthsSafe = useMemo(
    () => ([3, 6, 9].includes(Number(months)) ? Number(months) : 3),
    [months]
  );
  const [clientSecret, setClientSecret] = useState("");
  const [loadingInit, setLoadingInit] = useState(false);
  const [serverSchedule, setServerSchedule] = useState(null);
  const [startPlan, { isLoading: creatingPlan }] =
    useStripeSepaInstallmentsMutation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!active) return;
      setErrorMsg("");
      if (paymentMethodId) {
        setClientSecret("");
        return;
      } // saved PM → no SI needed
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
          setErrorMsg(pickErr(e, t("checkout.sepaInstallments.prepareFailed")));
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, paymentMethodId, form?.email]);

  const startWithSavedPM = async () => {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: form.email,
        couponCode,
        payment_method: "sepa_installments",
        installments_months: monthsSafe,
        extra: {
          months: monthsSafe,
          payment_method_id: paymentMethodId,
          country: (countryCode || "DE").toUpperCase(),
        },
      });
      const res = await startPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error(t("checkout.sepaInstallments.orderMissing"));
      setServerSchedule({
        months: res?.months,
        amounts: res?.amounts,
        dates: res?.dates,
      });
      setLocalOrderId?.(orderId);
      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(pickErr(e, t("checkout.sepaInstallments.startFailed")));
    }
  };

  if (!active) {
    return (
      <div className="border rounded p-3 mt-3">
        <div className="text-sm text-gray-600">
          {t("checkout.sepaInstallments.inactive", { months: monthsSafe })}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-2">
      <div className="text-sm">
        {t("checkout.sepaInstallments.intro", { months: monthsSafe })}
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      {serverSchedule && (
        <InstallmentsSchedulePreview
          months={serverSchedule.months}
          total={null}
          serverSchedule={serverSchedule}
        />
      )}

      {paymentMethodId ? (
        <button
          disabled={creatingPlan}
          onClick={startWithSavedPM}
          className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
        >
          {creatingPlan
            ? t("checkout.sepaInstallments.savedStarting")
            : t("checkout.sepaInstallments.savedStart")}
        </button>
      ) : (
        <>
          {loadingInit && (
            <div className="text-sm text-gray-600">{t("checkout.sepaInstallments.preparing")}</div>
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
                onCreated={(orderId, schedule) => {
                  setServerSchedule(schedule || null);
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
