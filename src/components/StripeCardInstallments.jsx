import { useState, useMemo } from "react";
import { useStripeCardInstallmentsMutation } from "../features/payments/paymentsApi";
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

/**
 * Requires a saved card payment_method_id (from a prior SetupIntent).
 */
export default function StripeCardInstallments({
  active,
  setActive,
  months,
  form,
  items,
  couponCode,
  paymentMethodId,
  setLocalOrderId,
  onSuccess,
}) {
  const [createPlan, { isLoading }] = useStripeCardInstallmentsMutation();
  const [errorMsg, setErrorMsg] = useState("");

  const monthsSafe = useMemo(() => {
    const m = Number(months);
    return [3, 6, 9].includes(m) ? m : 3;
  }, [months]);

  async function handleStartPlan() {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: form.email,
        couponCode,
        payment_method: "card_installments",
        extra: {
          months: monthsSafe,
          payment_method_id: paymentMethodId,
        },
      });

      const res = await createPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");

      setLocalOrderId?.(orderId);
      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(pickErr(e, "Failed to start installments."));
    }
  }

  if (!active) {
    return (
      <div className="border rounded p-3 mt-4">
        <div className="text-sm text-gray-600">
          0% financing with card ({monthsSafe} months)
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-2">
      <div className="text-sm">
        Confirm card-based installments ({monthsSafe} months).
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      <button
        disabled={isLoading}
        onClick={handleStartPlan}
        className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
      >
        {isLoading ? "Starting…" : "Start installments"}
      </button>
    </div>
  );
}
