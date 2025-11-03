import { useState } from "react";
import { useStripeCardInstallmentsMutation } from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";

/**
 * Props:
 *  active, setActive
 *  months (3,6,9) chosen
 *  form, items, couponCode, total
 *  setLocalOrderId, onSuccess
 *
 * NOTE: You still need UI somewhere to run a Stripe SetupIntent for card
 * to get payment_method_id (saved card). That UI is not in this snippet
 * because it's usually a separate <CardSetupForm /> step.
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
          months,
          payment_method_id: paymentMethodId,
        },
      });

      const res = await createPlan(payload).unwrap();
      // backend returns {order_id, schedule_id}
      setLocalOrderId?.(res.order_id);
      onSuccess?.(res.order_id);
    } catch (e) {
      setErrorMsg(
        e?.data?.detail || e?.data?.error || "Failed to start installments."
      );
    }
  }

  if (!active) {
    return (
      <div className="border rounded p-3 mt-4">
        {/* Radio/summary is handled by parent (Checkout) */}
        <div className="text-sm text-gray-600">
          0% financing with card ({months} months)
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-2">
      <div className="text-sm">
        Confirm card-based installments ({months} months).
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
