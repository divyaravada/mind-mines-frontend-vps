import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import http from "../services/http";
import { toAbsoluteUrl } from "../utils/urls";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../services/config";

function KV({ k, v }) {
  return (
    <div className="flex items-center justify-between bg-white rounded px-3 py-2">
      <div className="text-gray-500">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}

function BankBlock({ bankInfo, t }) {
  return (
    <div className="mb-6 border rounded p-4 bg-gray-50">
      <h2 className="font-semibold mb-2">{t("checkoutSuccess.bankTitle")}</h2>
      <p className="text-sm text-gray-600 mb-3">
        {t("checkoutSuccess.bankIntro")}
        <span className="font-semibold">{bankInfo.amount} €</span>
        {t("checkoutSuccess.bankIntro2")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <KV k={t("checkoutSuccess.amount")} v={`${bankInfo.amount} €`} />
        <KV k={t("checkoutSuccess.reference")} v={bankInfo.reference} />
        <KV k={t("checkoutSuccess.iban")} v={bankInfo.iban} />
        <KV k={t("checkoutSuccess.bic")} v={bankInfo.bic} />
        <KV k={t("checkoutSuccess.beneficiary")} v={bankInfo.beneficiary} />
      </div>

      {bankInfo.instructions && (
        <p className="text-xs text-gray-500 mt-3">{bankInfo.instructions}</p>
      )}
    </div>
  );
}

export default function CheckoutSuccess() {
  const { t } = useTranslation();
  const [sp] = useSearchParams();
  const orderId = sp.get("order");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState(null);
  const [error, setError] = useState(null);

  const hasAuth = useMemo(() => !!localStorage.getItem("authTokens"), []);

  // Restore bank info if present
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bank_checkout_info");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && String(parsed.order_id) === String(orderId)) {
        setBankInfo(parsed);
      }
    } catch {}
  }, [orderId]);

  // Guest restore
  const [guestInfo, setGuestInfo] = useState(null);
  useEffect(() => {
    if (hasAuth) return;
    try {
      const raw = sessionStorage.getItem("guest_checkout_info");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && String(parsed.order_id) === String(orderId)) {
        setGuestInfo(parsed);
      }
    } catch {}
    setLoading(false);
  }, [orderId, hasAuth]);

  // Authenticated fetch
  useEffect(() => {
    if (!orderId || !hasAuth) {
      setLoading(false);
      return;
    }

    let timer;
    let stopped = false;

    const load = async () => {
      try {
        const res = await http.get(`orders/${orderId}/`);
        setOrder(res.data);
        setError(null);

        if (res.data?.invoice_pdf) {
          stopped = true;
          if (timer) clearInterval(timer);
        }
      } catch (e) {
        setError(e?.response?.data?.detail || t("checkoutSuccess.loadError"));
      } finally {
        setLoading(false);
      }
    };

    load();
    timer = setInterval(() => !stopped && load(), 5000);
    return () => clearInterval(timer);
  }, [orderId, t, hasAuth]);

  if (!orderId) {
    return (
      <div className="p-10 text-center">{t("checkoutSuccess.noOrder")}</div>
    );
  }
  if (hasAuth && loading) {
    return <div className="p-10 text-center">{t("common.loading")}</div>;
  }
  if (hasAuth && error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  // ---- Logged-in mode ----
  if (hasAuth) {
    const hasInvoice = !!order?.invoice_pdf;
    const isBank = order?.payment_method === "bank";
    const isPaid = order?.status === "paid";

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10 text-center">
        <h1 className="text-2xl font-bold mb-2">
          {t("checkoutSuccess.thankYou")}
        </h1>
        <p className="text-gray-600 mb-6">
          {t("checkoutSuccess.created", {
            number: order?.number || orderId,
            defaultValue: "Your order {{number}} was created.",
          })}
        </p>

        {isBank && !isPaid && bankInfo && (
          <BankBlock bankInfo={bankInfo} t={t} />
        )}

        <div className="text-center">
          {hasInvoice ? (
            <a
              href={toAbsoluteUrl(order.invoice_pdf)}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 rounded bg-gray-900 text-white"
            >
              {t("checkoutSuccess.downloadInvoice")}
            </a>
          ) : isBank && !isPaid ? (
            <p className="text-sm text-gray-600">
              {t("checkoutSuccess.waitingBank")}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              {t("checkoutSuccess.generatingInvoice")}
            </p>
          )}
        </div>

        <div className="mt-6">
          <Link to="/account/orders" className="text-blue-600 underline">
            {t("checkoutSuccess.goToOrders")}
          </Link>
        </div>
      </div>
    );
  }

  // ---- Guest mode ----
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10 text-center">
      <h1 className="text-2xl font-bold mb-2">
        {t("checkoutSuccess.thankYou")}
      </h1>

      <p className="text-gray-600 mb-4">
        {guestInfo
          ? t("checkoutSuccess.created", {
              number: guestInfo.order_number || orderId,
              defaultValue: "Your order {{number}} was created.",
            })
          : t("checkoutSuccess.createdNoNumber", {
              defaultValue: "Your order was created.",
            })}
      </p>

      {guestInfo?.bank && (
        <div className="mb-6 border rounded p-4 bg-gray-50 text-left">
          <h2 className="font-semibold mb-2">
            {t("checkoutSuccess.bankTitle")}
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            {t("checkoutSuccess.bankIntro")}
            <span className="font-semibold">{guestInfo.bank.amount} €</span>
            {t("checkoutSuccess.bankIntro2")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <KV
              k={t("checkoutSuccess.amount")}
              v={`${guestInfo.bank.amount} €`}
            />
            <KV
              k={t("checkoutSuccess.reference")}
              v={guestInfo.bank.reference}
            />
            <KV k={t("checkoutSuccess.iban")} v={guestInfo.bank.iban} />
            <KV k={t("checkoutSuccess.bic")} v={guestInfo.bank.bic} />
            <KV
              k={t("checkoutSuccess.beneficiary")}
              v={guestInfo.bank.beneficiary}
            />
          </div>

          {guestInfo.bank.instructions && (
            <p className="text-xs text-gray-500 mt-3">
              {guestInfo.bank.instructions}
            </p>
          )}
        </div>
      )}

      {guestInfo && (
        <div className="text-center mb-6">
          <a
            className="inline-block px-4 py-2 rounded bg-gray-900 text-white"
            href={
              `${API_BASE}orders/guest-invoice-download/` +
              `?order_number=${encodeURIComponent(
                guestInfo.order_number || ""
              )}` +
              `&email=${encodeURIComponent(guestInfo.email || "")}`
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("checkoutSuccess.downloadInvoice", {
              defaultValue: "Download invoice",
            })}
          </a>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <Link to="/guest-order" className="text-blue-600 underline block">
          {t("checkoutSuccess.trackGuest", {
            defaultValue: "Track / view my order as guest",
          })}
        </Link>

        <Link to="/" className="text-gray-700 underline block">
          {t("checkoutSuccess.backHome", { defaultValue: "Back to home" })}
        </Link>
      </div>
    </div>
  );
}
