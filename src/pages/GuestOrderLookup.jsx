import { useEffect, useState } from "react";
import http from "../services/http";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function pickErr(e, fallback) {
  return (
    e?.response?.data?.detail ||
    e?.response?.data?.error ||
    (typeof e === "string" ? e : "") ||
    fallback
  );
}

function formatCurrency(value, currency = "EUR") {
  if (value === null || value === undefined || value === "") return "-";
  let num = Number(value);
  if (!Number.isFinite(num)) {
    const parsed = Number(
      String(value)
        .replace(/[^0-9.,-]/g, "")
        .replace(",", ".")
    );
    if (Number.isFinite(parsed)) num = parsed;
  }
  if (Number.isFinite(num)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(num);
    } catch {
      return `${num.toFixed(2)} ${currency}`;
    }
  }
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  } catch {}
  return String(value);
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm mt-1">
      <div className="text-gray-600 dark:text-gray-300">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ItemsList({ items, currency, t }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {t("guest.items", { defaultValue: "Items" })}
      </div>
      <ul className="border dark:border-neutral-700 rounded-lg divide-y divide-gray-200 dark:divide-neutral-800">
        {items.map((item, idx) => {
          const key = `${item?.product_id ?? idx}-${idx}`;
          const qty = item?.quantity ?? item?.qty ?? 1;
          return (
            <li
              key={key}
              className="px-3 py-2 flex items-start justify-between text-sm"
            >
              <div className="pr-3">
                <div className="font-medium">
                  {item?.name ||
                    item?.product_name ||
                    t("guest.item", { defaultValue: "Item" })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t("guest.quantityLabel", { defaultValue: "Qty" })}: {qty} |{" "}
                  {formatCurrency(item?.unit_price, currency)}
                </div>
              </div>
              <div className="font-medium whitespace-nowrap">
                {formatCurrency(item?.line_total, currency)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function renderAddress(addr) {
  if (!addr) return null;
  const parts = [];
  const first = addr.first_name || addr.firstName;
  const last = addr.last_name || addr.lastName;
  if (first || last) parts.push([first, last].filter(Boolean).join(" "));
  const line1 = addr.line1 || addr.address_line1 || "";
  const line2 = addr.line2 || addr.address_line2 || "";
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);
  const postal = addr.postal_code || addr.postalCode || "";
  const city = addr.city || "";
  const cityLine = [postal, city].filter(Boolean).join(" ");
  if (cityLine) parts.push(cityLine);
  const country = addr.country || addr.country_code || addr.countryCode;
  if (country) parts.push(country);
  if (addr.phone) parts.push(addr.phone);
  return (
    <>
      {parts.map((p, i) => (
        <div key={`${p}-${i}`}>{p}</div>
      ))}
    </>
  );
}

function prettyStatus(statusRaw, t) {
  const key = (statusRaw || "").toLowerCase();
  const map = {
    pending: t("guest.status.pending"),
    processing: t("guest.status.processing"),
    paid: t("guest.status.paid"),
    shipped: t("guest.status.shipped"),
    delivered: t("guest.status.delivered"),
    cancelled: t("guest.status.canceled"),
    canceled: t("guest.status.canceled"),
    failed: t("guest.status.failed"),
    awaiting_payment: t("guest.status.awaitingPayment"),
  };
  return map[key] || statusRaw || "-";
}

function prettyPayment(pm, t) {
  if (!pm) return "-";
  const key = String(pm).toLowerCase();
  const map = {
    bank: t("guest.payment.bank"),
    bank_transfer: t("guest.payment.bank"),
    sepa: t("guest.payment.sepa"),
    sepa_debit: t("guest.payment.sepa"),
    sepa_installments: t("guest.payment.sepaInstallments"),
    card: t("guest.payment.card"),
    card_installments: t("guest.payment.cardInstallments"),
    paypal: t("guest.payment.paypal"),
    giropay: t("guest.payment.giropay"),
    klarna: t("guest.payment.klarna"),
  };
  return map[key] || pm;
}

export default function GuestOrderLookupPage() {
  const { t } = useTranslation();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("guest_lookup_last");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.order_number) setOrderNumber(parsed.order_number);
      if (parsed?.email) setEmail(parsed.email);
    } catch {}
  }, []);

  const onLookup = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    const num = orderNumber.trim();
    const em = email.trim();
    if (!num || !em) {
      setError(
        t("guest.formError", {
          defaultValue: "Please enter order number and email.",
        })
      );
      return;
    }
    setLoading(true);
    try {
      const res = await http.post("orders/guest-lookup/", {
        order_number: num,
        email: em,
      });
      setResult(res.data || null);
      sessionStorage.setItem(
        "guest_lookup_last",
        JSON.stringify({ order_number: num, email: em })
      );
    } catch (err) {
      setError(
        pickErr(
          err,
          t("guest.notFound", {
            defaultValue:
              "We could not find an order with that email and number.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const invoiceHref =
    result?.invoice_download_url || result?.invoice_pdf || null;
  const shippingSnapshot =
    result?.shipping_snapshot ||
    result?.shipping ||
    result?.shipping_address ||
    result?.shippingAddress ||
    null;
  const trackingUrl = result?.tracking_url || result?.tracking?.url;
  const trackingNumber = result?.tracking_number || result?.tracking?.number;

  return (
    <div className="min-h-screen bg-marblewhite dark:text-backnewsdark dark:bg-marbleblack">
      <div className="container max-w-xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-semibold mb-2 text-center">
          {t("guest.lookupTitle", { defaultValue: "Track your order (guest)" })}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-8 text-sm">
          {t("guest.lookupDesc", {
            defaultValue:
              "Enter the order number from your confirmation email and the same email address you used at checkout.",
          })}
        </p>

        <form
          onSubmit={onLookup}
          className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              {t("guest.orderNumber", { defaultValue: "Order number" })}{" "}
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                (e.g. MM00000406)
              </span>
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="MM00000406"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              {t("guest.email", { defaultValue: "Email" })}
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60 transition"
          >
            {loading
              ? t("guest.loading", { defaultValue: "Looking up..." })
              : t("guest.lookupButton", { defaultValue: "Find my order" })}
          </button>
        </form>

        {result && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6 mt-8 space-y-4">
            <h2 className="text-lg font-semibold">
              {t("guest.orderSummary", { defaultValue: "Order summary" })}
            </h2>

            <Row
              label={t("guest.resultOrderNumber", {
                defaultValue: "Order number",
              })}
              value={result.order_number || orderNumber}
            />
            <Row
              label={t("guest.resultCreated", { defaultValue: "Placed on" })}
              value={formatDateTime(result.created_at)}
            />
            <Row
              label={t("guest.resultStatus", { defaultValue: "Status" })}
              value={prettyStatus(result.status, t)}
            />
            <Row
              label={t("guest.resultTotal", { defaultValue: "Total" })}
              value={formatCurrency(result.total_price, result.currency)}
            />
            <Row
              label={t("guest.resultPayment", {
                defaultValue: "Payment method",
              })}
              value={prettyPayment(result.payment_method, t)}
            />

            {shippingSnapshot && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t("guest.shippingTo", { defaultValue: "Shipping to" })}
                </div>
                <div className="text-sm font-medium">
                  {renderAddress(shippingSnapshot)}
                </div>
              </div>
            )}

            <ItemsList items={result.items} currency={result.currency} t={t} />

            {(trackingUrl || trackingNumber) && (
              <div className="space-y-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t("guest.tracking", { defaultValue: "Shipping tracking" })}
                </div>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-blue-600 underline"
                  >
                    {t("guest.trackLink", {
                      defaultValue: "Open tracking link",
                    })}
                  </a>
                )}
                {trackingNumber && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("guest.trackingNumber", {
                      defaultValue: "Tracking number",
                    })}
                    : {trackingNumber}
                  </div>
                )}
              </div>
            )}

            {invoiceHref ? (
              <a
                href={invoiceHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-lg bg-backnewswhite text-white text-sm hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition"
              >
                {t("guest.downloadInvoice", {
                  defaultValue: "Download invoice (PDF)",
                })}
              </a>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("guest.invoiceNotReady", {
                  defaultValue:
                    "Your invoice will be available once payment is confirmed.",
                })}
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-8">
          <Link
            to="/"
            className="text-gray-700 dark:text-gray-200 underline text-sm"
          >
            {t("guest.backHome", { defaultValue: "Back to Home" })}
          </Link>
        </div>
      </div>
    </div>
  );
}
