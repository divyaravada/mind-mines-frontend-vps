import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toAbsoluteUrl } from "../utils/urls";
import { useTranslation } from "react-i18next";
import http from "../services/http";

function KV({ k, v }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-neutral-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-neutral-800">
      <div className="text-gray-500 dark:text-gray-400">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}

function BankBlock({ bankInfo, t }) {
  return (
    <div className="mb-6 border border-gray-200 dark:border-neutral-800 rounded-xl p-4 bg-gray-50 dark:bg-neutral-900/60">
      <h2 className="font-semibold mb-2">{t("checkoutSuccess.bankTitle")}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {t("checkoutSuccess.bankIntro")}
        <span className="font-semibold"> {bankInfo.amount} € </span>
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {bankInfo.instructions}
        </p>
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
      if (parsed && String(parsed.order_id) === String(orderId))
        setBankInfo(parsed);
    } catch {}
  }, [orderId]);

  // Guest restore
  const [guestInfo, setGuestInfo] = useState(null);
  const [guestOrder, setGuestOrder] = useState(null);
  const [guestLookupError, setGuestLookupError] = useState("");

  const guestSummary = useMemo(
    () => guestOrder || guestInfo,
    [guestOrder, guestInfo]
  );
  const guestOrderNumber = useMemo(() => {
    if (guestSummary?.order_number) return guestSummary.order_number;
    if (guestSummary?.orderNumber) return guestSummary.orderNumber;
    if (guestSummary?.order_id) return String(guestSummary.order_id);
    if (guestSummary?.orderId) return String(guestSummary.orderId);
    return orderId;
  }, [guestSummary, orderId]);

  const guestInvoiceUrl = guestSummary?.invoice_download_url || null;
  const guestStatus = guestOrder?.status || guestSummary?.status || null;
  const guestTotal =
    guestOrder?.total_price || guestSummary?.total_price || null;
  const guestCurrency = guestOrder?.currency || guestSummary?.currency || "EUR";
  const guestPaymentMethod =
    guestOrder?.payment_method_label ||
    guestOrder?.payment_method ||
    guestSummary?.payment_method_label ||
    guestSummary?.payment_method ||
    null;

  useEffect(() => {
    if (hasAuth) return;
    try {
      const raw = sessionStorage.getItem("guest_checkout_info");
      if (!raw) {
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed) {
        const matches =
          !orderId ||
          !parsed.order_id ||
          String(parsed.order_id) === String(orderId);
        if (matches) {
          setGuestInfo(parsed);
          return;
        }
      }
    } catch {}
    setLoading(false);
  }, [orderId, hasAuth]);

  useEffect(() => {
    if (hasAuth) return;

    if (!guestInfo) {
      setGuestOrder(null);
      setGuestLookupError("");
      setLoading(false);
      return;
    }

    const guestEmail = (guestInfo.email || "").trim();
    const lookupNumber =
      guestInfo.order_number ||
      guestInfo.orderNumber ||
      guestInfo.order_id ||
      guestInfo.orderId ||
      orderId;

    if (!guestEmail || !lookupNumber) {
      setGuestLookupError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const payload = { order_number: String(lookupNumber), email: guestEmail };

    (async () => {
      if (!cancelled) setLoading(true);
      try {
        const res = await http.post("orders/guest-lookup/", payload);
        if (!cancelled) {
          setGuestOrder(res.data || null);
          setGuestLookupError("");
        }
      } catch {
        if (!cancelled) {
          setGuestOrder(null);
          setGuestLookupError(t("checkoutSuccess.guestLookupFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasAuth, guestInfo, orderId, t]);

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
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack dark:text-backnewsdark p-10 text-center">
        {t("checkoutSuccess.noOrder")}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack dark:text-backnewsdark p-10 text-center">
        {t("common.loading")}
      </div>
    );
  }
  if (hasAuth && error) {
    return (
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack p-10 text-center text-red-600">
        {error}
      </div>
    );
  }

  // ---- Logged-in mode ----
  if (hasAuth) {
    const hasInvoice = !!order?.invoice_pdf;
    const isBank = order?.payment_method === "bank";
    const isPaid = order?.status === "paid";

    return (
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack dark:text-backnewsdark">
        <div className="max-w-2xl mx-auto p-6 mt-10 bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:text-backnewsdark dark:ring-white/5 text-center">
          <h1 className="text-2xl font-bold mb-2">
            {t("checkoutSuccess.thankYou")}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t("checkoutSuccess.created", { number: order?.number || orderId })}
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
                className="inline-block px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition"
              >
                {t("checkoutSuccess.downloadInvoice")}
              </a>
            ) : isBank && !isPaid ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("checkoutSuccess.waitingBank")}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("checkoutSuccess.generatingInvoice")}
              </p>
            )}
          </div>

          <div className="mt-6">
            <Link
              to="/account/orders"
              className="text-backnewswhite dark:text-backnewsdark underline"
            >
              {t("checkoutSuccess.goToOrders")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- Guest mode ----
  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack dark:text-backnewsdark">
      <div className="max-w-2xl mx-auto p-6 mt-10 bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:text-backnewsdark dark:ring-white/5 text-center">
        <h1 className="text-2xl font-bold mb-2">
          {t("checkoutSuccess.thankYou")}
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {guestOrderNumber
            ? t("checkoutSuccess.created", { number: guestOrderNumber })
            : t("checkoutSuccess.createdNoNumber")}
        </p>

        {(guestStatus || guestTotal || guestPaymentMethod) && (
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4 space-y-1">
            {guestStatus && (
              <div>
                {t("checkoutSuccess.statusNow", { status: guestStatus })}
              </div>
            )}
            {guestTotal && (
              <div>
                {t("checkoutSuccess.totalGuest", {
                  amount: `${guestTotal} ${guestCurrency}`,
                })}
              </div>
            )}
            {guestPaymentMethod && (
              <div>
                {t("checkoutSuccess.paymentMethodGuest", {
                  method: guestPaymentMethod,
                })}
              </div>
            )}
          </div>
        )}

        {guestInfo?.bank && (
          <div className="mb-6 border border-gray-200 dark:border-neutral-800 rounded-xl p-4 bg-gray-50 dark:bg-neutral-900/60 dark:text-backnewsdark text-left">
            <h2 className="font-semibold mb-2">
              {t("checkoutSuccess.bankTitle")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {t("checkoutSuccess.bankIntro")}
              <span className="font-semibold"> {guestInfo.bank.amount} € </span>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-backnewsdark mt-3">
                {guestInfo.bank.instructions}
              </p>
            )}
          </div>
        )}

        {guestInvoiceUrl ? (
          <div className="text-center mb-6">
            <a
              className="inline-block px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition"
              href={guestInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("checkoutSuccess.downloadInvoice")}
            </a>
          </div>
        ) : guestSummary ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-backnewsdark text-center mb-6">
            {t("checkoutSuccess.guestInvoicePending")}
          </div>
        ) : null}

        {guestLookupError && (
          <div className="text-xs text-red-600 dark:text-red-500 text-center mb-4">
            {guestLookupError}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Link
            to="/guest-order"
            className="text-backnewswhite dark:text-backnewsdark underline block"
          >
            {t("checkoutSuccess.trackGuest")}
          </Link>

          <Link
            to="/"
            className="text-gray-700 dark:text-gray-300 underline block"
          >
            {t("checkoutSuccess.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
