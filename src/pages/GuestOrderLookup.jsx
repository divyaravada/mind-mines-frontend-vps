import { useState } from "react";
import http from "../services/http";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function GuestOrderLookupPage() {
  const { t } = useTranslation();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // result will look like:
  // {
  //   order_number: "MM00000406",
  //   status: "paid" | "pending" | "failed" | "refunded" | ...,
  //   payment_method: "card" | "sepa_debit" | "bank" | "paypal" | ...
  //   total_price: "59.95",
  //   invoice_available: true/false,
  //   shipping_address: { ... },
  //   created_at: "2025-11-01T15:37:00Z",
  //   // etc. whatever backend returns
  // }

  const onLookup = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const num = orderNumber.trim();
    const em = email.trim();

    if (!num || !em) {
      setError("Please enter order number and email.");
      return;
    }

    setLoading(true);
    try {
      const res = await http.post("orders/guest-lookup/", {
        order_number: num,
        email: em,
      });

      setResult(res.data || null);
      setError("");

      // Optionally cache so we can skip retyping later
      sessionStorage.setItem(
        "guest_lookup_last",
        JSON.stringify({ order_number: num, email: em })
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "We couldn't find an order with that email / number."
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper for invoice URL
  const invoiceHref = result?.invoice_available
    ? `/api/orders/guest-invoice-download/?order_number=${encodeURIComponent(
        result?.order_number || orderNumber.trim()
      )}&email=${encodeURIComponent(email.trim())}`
    : null;

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold mb-2 text-center">
        {t("guest.lookupTitle", {
          defaultValue: "Track your order (guest)",
        })}
      </h1>
      <p className="text-gray-600 text-center mb-8 text-sm">
        {t("guest.lookupDesc", {
          defaultValue:
            "Enter the order number from your email confirmation and the same email address you used at checkout.",
        })}
      </p>

      {/* Form */}
      <form
        onSubmit={onLookup}
        className="bg-white rounded shadow p-6 space-y-4"
      >
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            {t("guest.orderNumber", {
              defaultValue: "Order number",
            })}{" "}
            <span className="text-gray-400 text-xs">(e.g. MM00000406)</span>
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="MM00000406"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            {t("guest.email", { defaultValue: "Email" })}
          </label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {error && <div className="text-red-600 text-sm">{String(error)}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
        >
          {loading
            ? t("guest.checking", { defaultValue: "Checking..." })
            : t("guest.lookupButton", { defaultValue: "Find my order" })}
        </button>
      </form>

      {/* Result block */}
      {result && (
        <div className="bg-white rounded shadow p-6 mt-8 space-y-4">
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
            label={t("guest.resultStatus", {
              defaultValue: "Status",
            })}
            value={prettyStatus(result.status)}
          />

          <Row
            label={t("guest.resultTotal", { defaultValue: "Total" })}
            value={result.total_price ? `${result.total_price} €` : "--"}
          />

          <Row
            label={t("guest.resultPayment", {
              defaultValue: "Payment method",
            })}
            value={prettyPayment(result.payment_method)}
          />

          {result?.shipping_address && (
            <div>
              <div className="text-sm text-gray-500">
                {t("guest.shippingTo", {
                  defaultValue: "Shipping to",
                })}
              </div>
              <div className="text-sm font-medium">
                {renderAddress(result.shipping_address)}
              </div>
            </div>
          )}

          {invoiceHref ? (
            <a
              href={invoiceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded bg-gray-900 text-white text-sm"
            >
              {t("guest.downloadInvoice", {
                defaultValue: "Download invoice (PDF)",
              })}
            </a>
          ) : (
            <div className="text-xs text-gray-500">
              {t("guest.invoiceNotReady", {
                defaultValue:
                  "Your invoice will be available once payment is confirmed.",
              })}
            </div>
          )}
        </div>
      )}

      {/* back links */}
      <div className="text-center mt-8 space-y-2">
        <Link to="/" className="text-gray-700 underline block text-sm">
          {t("guest.backHome", { defaultValue: "Back to Home" })}
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}

// Make status human friendly for display
function prettyStatus(statusRaw) {
  const s = (statusRaw || "").toLowerCase();
  if (s === "paid") return "Paid ✅";
  if (s === "pending") return "Pending / Processing";
  if (s === "unpaid" || s === "awaiting_payment") return "Awaiting payment";
  if (s === "shipped") return "Shipped 📦";
  if (s === "cancelled" || s === "canceled") return "Canceled";
  return statusRaw || "-";
}

// Make payment method human readable
function prettyPayment(pm) {
  const p = (pm || "").toLowerCase();
  if (p === "bank") return "Bank Transfer";
  if (p === "sepa_debit") return "SEPA Direct Debit";
  if (p === "card") return "Card / Stripe";
  if (p === "paypal") return "PayPal";
  return pm || "-";
}

// Render address object
function renderAddress(a) {
  if (!a) return "";
  // We try common naming patterns from your backend
  const line1 =
    a.address_line1 ||
    [a.street_name, a.house_number].filter(Boolean).join(" ") ||
    "";
  const line2 = a.address_line2 || a.apartment || "";
  const cityRow = [a.postal_code, a.city].filter(Boolean).join(" ");
  const country = a.country || a.country_code || "";

  return (
    <>
      {a.first_name || a.last_name ? (
        <div>{[a.first_name, a.last_name].filter(Boolean).join(" ")}</div>
      ) : null}
      {line1 && <div>{line1}</div>}
      {line2 && <div>{line2}</div>}
      <div>{cityRow}</div>
      <div>{country}</div>
    </>
  );
}
