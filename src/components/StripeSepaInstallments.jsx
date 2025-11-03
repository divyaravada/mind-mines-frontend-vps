import { useState, useMemo } from "react";
import { useStripeSepaInstallmentsMutation } from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";

function pickErr(e, fallback) {
  return (
    e?.data?.detail ||
    e?.data?.error ||
    e?.error ||
    (typeof e === "string" ? e : "") ||
    fallback
  );
}

export default function StripeSepaInstallments({
  active,
  setActive,
  months,
  form,
  items,
  couponCode,
  paymentMethodId, // saved mandate's payment_method id (optional)
  countryCode,
  setLocalOrderId,
  onSuccess,
}) {
  const [startSepaPlan, { isLoading }] = useStripeSepaInstallmentsMutation();
  const [errorMsg, setErrorMsg] = useState("");

  const monthsSafe = useMemo(() => {
    const m = Number(months);
    return [3, 6, 9].includes(m) ? m : 3;
  }, [months]);

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
          months: monthsSafe,
          payment_method_id: paymentMethodId || undefined,
          country: countryCode || "DE",
        },
      });

      const res = await startSepaPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");
      setLocalOrderId?.(orderId);
      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(pickErr(e, "Failed to start SEPA plan."));
    }
  }

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
