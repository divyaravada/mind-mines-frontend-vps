// src/components/StripeCardInstallments.jsx
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  useStripeCreateSetupIntentMutation,
  useStripeCardInstallmentsMutation,
} from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";
import InstallmentsSchedulePreview from "./InstallmentsSchedulePreview";
import { stripePromise } from "../lib/stripe";

const pickErr = (e, fb) =>
  e?.data?.detail ||
  e?.data?.error ||
  e?.error ||
  (typeof e === "string" ? e : "") ||
  fb;

function SaveCardStep({ email, onSaved, onError }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [createSI, { isLoading }] = useStripeCreateSetupIntentMutation();
  const [cs, setCs] = useState("");
  const [saving, setSaving] = useState(false);

  async function initSI() {
    try {
      const r = await createSI({ email: (email || "").trim() }).unwrap();
      const secret = r?.client_secret || r?.clientSecret || "";
      if (!secret) throw new Error(t("checkout.installments.missingSecret"));
      setCs(secret);
    } catch (e) {
      onError?.(pickErr(e, t("checkout.installments.prepareFailed")));
    }
  }

  async function saveCard() {
    if (!stripe || !elements || !cs) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setSaving(true);
    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(cs, {
        payment_method: {
          card,
          billing_details: { email: email || undefined },
        },
      });

      if (error)
        throw new Error(error.message || t("checkout.installments.saveFailed"));

      const pm = setupIntent?.payment_method;
      if (!pm) throw new Error(t("checkout.installments.noPaymentMethod"));
      onSaved?.(pm);
    } catch (e) {
      onError?.(pickErr(e, t("checkout.installments.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {!cs ? (
        <button
          type="button"
          className="px-3 py-2 rounded-md bg-backnewsdark text-white text-sm font-semibold hover:brightness-95
                     focus:outline-none focus:ring-2 focus:ring-backnewsdark/40
                     disabled:opacity-60"
          onClick={initSI}
          disabled={isLoading}
          aria-label={t("checkout.installments.addCard")}
        >
          {isLoading
            ? t("checkout.installments.preparing")
            : t("checkout.installments.addCard")}
        </button>
      ) : (
        <>
          <div className="rounded-md p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            <CardElement options={{ hidePostalCode: true }} />
          </div>
          <button
            type="button"
            className="px-3 py-2 rounded-md bg-backnewsdark text-white text-sm font-semibold hover:brightness-95
                       focus:outline-none focus:ring-2 focus:ring-backnewsdark/40
                       disabled:opacity-60"
            onClick={saveCard}
            disabled={saving}
            aria-label={t("checkout.installments.saveCard")}
          >
            {saving
              ? t("checkout.installments.saving")
              : t("checkout.installments.saveCard")}
          </button>
        </>
      )}

      <p className="text-xs text-gray-700 dark:text-gray-200">
        {t("checkout.installments.storeHint")}
      </p>
    </div>
  );
}

export default function StripeCardInstallments({
  active,
  months,
  form,
  items,
  couponCode,
  promotion,
  paymentMethodId,
  setLocalOrderId,
  onSuccess,
}) {
  const { t, i18n } = useTranslation();
  const [createPlan, { isLoading }] = useStripeCardInstallmentsMutation();
  const [errorMsg, setErrorMsg] = useState("");
  const [localPM, setLocalPM] = useState(paymentMethodId || null);
  const [serverSchedule, setServerSchedule] = useState(null);

  const monthsSafe = useMemo(
    () => ([3, 6, 9].includes(Number(months)) ? Number(months) : 3),
    [months],
  );

  async function startPlan(pmId) {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: (form?.email || "").trim(),
        couponCode,
        promotion,
        payment_method: "card_installments",
        installments_months: monthsSafe,
        extra: { months: monthsSafe, payment_method_id: pmId },
      });

      const res = await createPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error(t("checkout.installments.orderMissing"));

      setServerSchedule({
        months: res?.months,
        amounts: res?.amounts,
        dates: res?.dates,
      });

      setLocalOrderId?.(orderId);
      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(pickErr(e, t("checkout.installments.startFailed")));
    }
  }

  if (!active) {
    return (
      <div className="border rounded-md p-3 mt-4 bg-marblewhite dark:bg-marbleblack border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-200">
          {t("checkout.installments.inactive", { months: monthsSafe })}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-3 mt-2 space-y-3 bg-marblewhite dark:bg-marbleblack border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-800 dark:text-gray-200">
        {t("checkout.installments.confirm", { months: monthsSafe })}
      </div>

      {errorMsg && (
        <div className="text-sm text-red-600 dark:text-red-400">{errorMsg}</div>
      )}

      {serverSchedule && (
        <InstallmentsSchedulePreview
          months={serverSchedule.months}
          total={null}
          serverSchedule={serverSchedule}
        />
      )}

      <Elements
        stripe={stripePromise}
        options={{
          appearance: { theme: "stripe" },
          locale: i18n.language?.startsWith("de") ? "de" : "en",
        }}
      >
        {!localPM ? (
          <SaveCardStep
            email={(form?.email || "").trim()}
            onSaved={(pm) => setLocalPM(pm)}
            onError={(m) => setErrorMsg(m)}
          />
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => startPlan(localPM)}
              className="px-4 py-2 rounded-md bg-backnewswhite text-white text-sm font-semibold hover:brightness-95
                         focus:outline-none focus:ring-2 focus:ring-backnewswhite/40
                         disabled:opacity-60"
              aria-label={t("checkout.installments.start")}
            >
              {isLoading
                ? t("checkout.installments.starting")
                : t("checkout.installments.start")}
            </button>

            <button
              type="button"
              className="text-xs underline text-gray-700 dark:text-gray-200"
              onClick={() => {
                setLocalPM(null);
                setServerSchedule(null);
              }}
              aria-label={t("checkout.installments.useDifferent")}
            >
              {t("checkout.installments.useDifferent")}
            </button>
          </div>
        )}
      </Elements>
    </div>
  );
}
