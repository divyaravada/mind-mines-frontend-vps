// src/components/payment/KlarnaWidget.jsx
import { useEffect, useState } from "react";
import { api } from "../../services/apiSlice";
import { useTranslation } from "react-i18next";

function useScript(src) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) {
      setReady(true);
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => setReady(true);
    el.onerror = () => setReady(false);
    document.body.appendChild(el);
  }, [src]);
  return ready;
}

function toISO(country) {
  switch ((country || "").toLowerCase()) {
    case "germany":
      return "DE";
    case "austria":
      return "AT";
    case "switzerland":
      return "CH";
    default:
      return "DE";
  }
}
const fmtEUR = (n, locale = "en") => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
};
export default function KlarnaWidget({
  active,
  setActive,
  items,
  form,
  total,
  category, // "pay_later" | "pay_over_time"
  months,
  label,
  onSuccess,
  setLocalOrderId,
}) {
  const { t, i18n } = useTranslation();
  const ready = useScript("https://x.klarnacdn.net/kp/lib/v1/api.js");
  const [clientToken, setClientToken] = useState(null);
  const [localOrderId, setLocalId] = useState(null);
  const [loading, setLoading] = useState(false);
  const locale = i18n.language || "en";

  const prettyLabel =
    label ||
    (category === "pay_over_time"
      ? t("footer.payment.klarna.ctaInstallments")
      : t("footer.payment.klarna.ctaInvoice"));

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value={category}
          checked={active}
          onChange={setActive}
        />
        <span className="flex-1">
          {category === "pay_over_time"
            ? t("footer.payment.klarna.installmentsLabel")
            : t("footer.payment.klarna.invoiceLabel")}
        </span>
        <span className="text-xs font-semibold text-pink-600">Klarna</span>
      </label>

      {active && (
        <div className="border rounded p-3">
          {!clientToken ? (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await api.post("payments/klarna/session/", {
                    items,
                    payment_method: "klarna",
                    category,
                    months,
                    full_name: form.fullName,
                    country: form.country,
                    house_number: form.houseNumber || "—",
                    street_name: form.street,
                    apartment: form.apartment,
                    postal_code: form.postalCode,
                    city: form.city,
                    phone: form.telephone,
                  });
                  setClientToken(res.data.client_token);
                  setLocalId(res.data.order_id);
                  setLocalOrderId(res.data.order_id);

                  if (ready && window.Klarna) {
                    window.Klarna.Payments.init({
                      client_token: res.data.client_token,
                    });
                    window.Klarna.Payments.load(
                      {
                        container: "#klarna-container",
                        payment_method_category: category,
                      },
                      (resp) => {
                        if (resp.show_form !== true)
                          console.warn("Klarna load:", resp);
                      }
                    );
                  }
                } catch {
                  alert(t("footer.payment.klarna.sessionFailed"));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!ready || loading}
              className="w-full py-3 rounded bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-60"
            >
              {loading ? t("footer.payment.klarna.starting") : prettyLabel}
            </button>
          ) : (
            <>
              <div id="klarna-container" />
              <button
                onClick={() => {
                  if (!localOrderId) {
                    alert(t("footer.payment.klarna.noOrder"));
                    return;
                  }
                  if (!window.Klarna) return;
                  window.Klarna.Payments.authorize(
                    { payment_method_category: category },
                    {
                      billing_address: {
                        given_name: form.fullName || "Customer",
                        family_name: "",
                        street_address:
                          `${form.street} ${form.houseNumber}`.trim(),
                        postal_code: form.postalCode,
                        city: form.city,
                        country: toISO(form.country),
                        email: form.email || "customer@example.com",
                        phone: form.telephone || "",
                      },
                      shipping_address: {
                        given_name: form.fullName || "Customer",
                        family_name: "",
                        street_address:
                          `${form.street} ${form.houseNumber}`.trim(),
                        postal_code: form.postalCode,
                        city: form.city,
                        country: toISO(form.country),
                        email: form.email || "customer@example.com",
                        phone: form.telephone || "",
                      },
                    },
                    async (res) => {
                      if (res.approved && res.authorization_token) {
                        try {
                          const r = await api.post("payments/klarna/confirm/", {
                            order_id: localOrderId,
                            authorization_token: res.authorization_token,
                            category,
                            months,
                          });
                          if (r.data?.status === "ok") onSuccess(localOrderId);
                          else alert(t("footer.payment.klarna.confirmFailed"));
                        } catch {
                          alert(t("footer.payment.klarna.confirmFailed"));
                        }
                      } else {
                        alert(t("footer.payment.klarna.notApproved"));
                      }
                    }
                  );
                }}
                className="w-full py-3 rounded bg-pink-600 text-white font-semibold hover:bg-pink-700 mt-3"
              >
                {prettyLabel} — {fmtEUR(total, locale)}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
