// src/components/payment/CardFields.jsx
import { useEffect, useState } from "react";
import {
  PayPalHostedFieldsProvider,
  PayPalHostedField,
  usePayPalHostedFields,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { api } from "../../services/apiSlice";
import { useTranslation } from "react-i18next";

export default function CardFields({
  active,
  setActive,
  lineItems,
  form,
  onSuccess,
  setLocalOrderId,
}) {
  const { t } = useTranslation();
  const [{ isResolved }] = usePayPalScriptReducer();
  const [cardEligible, setCardEligible] = useState(false);

  useEffect(() => {
    if (!isResolved) return;
    const eligible = !!window?.paypal?.HostedFields?.isEligible?.();
    setCardEligible(eligible);
  }, [isResolved]);

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="card"
          checked={active}
          onChange={setActive}
        />
        <span className="flex-1">{t("footer.payment.card.methodLabel")}</span>
        <span className="text-xs font-semibold">
          {t("footer.payment.card.brands")}
        </span>
      </label>

      {active && (
        <div className="border rounded p-3 space-y-3">
          {!cardEligible ? (
            <div className="p-3 bg-yellow-50 text-yellow-700 text-sm rounded">
              {t("footer.payment.card.unavailable")}
            </div>
          ) : (
            <PayPalHostedFieldsProvider
              createOrder={async () => {
                const res = await api.post("payments/paypal/create-order/", {
                  items: lineItems,
                  payment_method: "card",
                  full_name: form.fullName,
                  country: form.country,
                  house_number: form.houseNumber || "—",
                  street_name: form.street,
                  apartment: form.apartment,
                  postal_code: form.postalCode,
                  city: form.city,
                  phone: form.telephone,
                });
                setLocalOrderId(res.data.order_id);
                return res.data.id;
              }}
              styles={{
                input: { "font-size": "16px", "font-family": "ui-sans-serif" },
                ":focus": { outline: "none" },
                ".invalid": { color: "#ef4444" },
                ".valid": { color: "#16a34a" },
                "::placeholder": { color: "#9ca3af" },
              }}
            >
              <div className="space-y-3">
                <div>
                  <label
                    className="text-sm text-gray-600"
                    htmlFor="card-number"
                  >
                    {t("footer.payment.card.number")}
                  </label>
                  <div
                    id="card-number"
                    className="w-full border rounded px-3 py-2"
                  />
                  <PayPalHostedField
                    hostedFieldType="number"
                    options={{
                      selector: "#card-number",
                      placeholder: "4111 1111 1111 1111",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-sm text-gray-600"
                      htmlFor="card-expiry"
                    >
                      {t("footer.payment.card.expiry")}
                    </label>
                    <div
                      id="card-expiry"
                      className="w-full border rounded px-3 py-2"
                    />
                    <PayPalHostedField
                      hostedFieldType="expirationDate"
                      options={{
                        selector: "#card-expiry",
                        placeholder: "MM/YY",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600" htmlFor="card-cvv">
                      {t("footer.payment.card.cvv")}
                    </label>
                    <div
                      id="card-cvv"
                      className="w-full border rounded px-3 py-2"
                    />
                    <PayPalHostedField
                      hostedFieldType="cvv"
                      options={{ selector: "#card-cvv", placeholder: "123" }}
                    />
                  </div>
                </div>
              </div>
              <CardPayButton onSuccess={onSuccess} />
            </PayPalHostedFieldsProvider>
          )}
        </div>
      )}
    </>
  );
}

function CardPayButton({ onSuccess }) {
  const { t } = useTranslation();
  const hostedFields = usePayPalHostedFields();
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    if (!hostedFields?.cardFields?.submit) return;
    try {
      setLoading(true);
      const { orderId } = await hostedFields.cardFields.submit({
        contingencies: ["3D_SECURE"],
      });
      const cap = await api.post(`payments/paypal/capture/${orderId}/`);
      if (cap.data?.status === "COMPLETED") onSuccess();
      else alert(t("footer.payment.card.captureFailed"));
    } catch {
      alert(t("footer.payment.card.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={pay}
      disabled={loading}
      className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60 mt-3"
    >
      {loading ? t("footer.payment.processing") : t("footer.payment.payNow")}
    </button>
  );
}
