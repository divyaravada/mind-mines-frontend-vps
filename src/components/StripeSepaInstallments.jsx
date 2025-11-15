// src/components/StripeSepaInstallments.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import InstallmentsSchedulePreview from "./InstallmentsSchedulePreview";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "../lib/stripe";
import { useStripeSepaInstallmentsMutation } from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";
import http from "../services/http";

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
      if (!orderId)
        throw new Error(t("checkout.sepaInstallments.orderMissing"));
      onCreated?.(orderId, {
        months: res?.months,
        amounts: res?.amounts,
        dates: res?.dates,
      });
    },
    [startPlan, monthsSafe, countryCode, form, items, couponCode, onCreated, t]
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
        throw new Error(
          error.message || t("checkout.sepaInstallments.mandateFailed")
        );
      const pmId = setupIntent?.payment_method;
      if (!pmId)
        throw new Error(t("checkout.sepaInstallments.noPaymentMethod"));
      await startInstallments(pmId);
    } catch (e) {
      setErrorMsg(pickErr(e, t("checkout.sepaInstallments.mandateFailed")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-lg p-3 bg-white dark:bg-marbleblack">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <button
        disabled={busy || isLoading || !stripe || !elements}
        onClick={confirmMandateThenCreate}
        className="px-4 py-3 rounded-lg text-sm font-semibold
                   bg-backnewswhite text-marblewhite hover:opacity-90 disabled:opacity-60"
      >
        {busy || isLoading
          ? t("common.processing")
          : t("checkout.sepaInstallments.startCta", { months })}
      </button>
      <p className="text-xs text-gray-600 dark:text-gray-300">
        {t("checkout.sepaInstallments.notice", { months })}
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
  const { t, i18n } = useTranslation();
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
      }
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
        if (!cs) throw new Error(t("checkout.sepaInstallments.prepareFailed"));
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
  }, [active, paymentMethodId, form?.email, t]);

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
      if (!orderId)
        throw new Error(t("checkout.sepaInstallments.orderMissing"));
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

  const isDark = document.documentElement.classList.contains("dark");
  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#855513",
      colorText: isDark ? "#e5e7eb" : "#1f2937",
      colorBackground: isDark ? "#17160f" : "#f8fcfe",
    },
  };

  if (!active) {
    return (
      <div className="border rounded-lg p-3 mt-3 bg-white dark:bg-marbleblack">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {t("checkout.sepaInstallments.inactive", { months: monthsSafe })}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 mt-2 space-y-2 bg-white dark:bg-marbleblack">
      <div className="text-sm text-gray-700 dark:text-gray-300">
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
          className="px-4 py-3 rounded-lg text-sm font-semibold
                     bg-backnewswhite text-marblewhite hover:opacity-90 disabled:opacity-60"
        >
          {creatingPlan
            ? t("checkout.sepaInstallments.savedStarting")
            : t("checkout.sepaInstallments.savedStart")}
        </button>
      ) : (
        <>
          {loadingInit && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {t("checkout.sepaInstallments.preparing")}
            </div>
          )}
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance,
                locale: i18n.language?.startsWith("de") ? "de" : "en",
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
