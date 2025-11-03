import { useState } from "react";
import { useStripeSepaInstallmentsMutation } from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";

export default function StripeSepaInstallments({
  active,
  setActive,
  months,
  form,
  items,
  couponCode,
  paymentMethodId, // from saved SEPA mandate SetupIntent
  countryCode,
  setLocalOrderId,
  onSuccess,
}) {
  const [startSepaPlan, { isLoading }] = useStripeSepaInstallmentsMutation();
  const [errorMsg, setErrorMsg] = useState("");

  async function handleStart() {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: form.email,
        couponCode,
        payment_method: "sepa_installments",
        extra: {
          months,
          payment_method_id: paymentMethodId,
          country: countryCode,
        },
      });

      const res = await startSepaPlan(payload).unwrap();
      setLocalOrderId?.(res.order_id);
      onSuccess?.(res.order_id);
    } catch (e) {
      setErrorMsg(
        e?.data?.detail || e?.data?.error || "Failed to start SEPA plan."
      );
    }
  }

  if (!active) {
    return (
      <div className="border rounded p-3 mt-3">
        <div className="text-sm text-gray-600">
          0% Finanzierung (SEPA Lastschrift) — {months} Monate
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-2">
      <div className="text-sm">
        SEPA installments ({months} Monate). Abbuchung monatlich.
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      <button
        disabled={isLoading}
        onClick={handleStart}
        className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
      >
        {isLoading ? "Starte..." : "Ratenzahlung starten"}
      </button>
    </div>
  );
}
