// src/pages/GuestOrderLookup.jsx
import { useState, useMemo } from "react";
import { useGuestLookupMutation } from "../features/orders/ordersApi";
import { useTranslation } from "react-i18next";

function fmtMoney(v, locale = "en") {
  const n =
    typeof v === "number"
      ? v
      : parseFloat(
          String(v)
            .replace(/[^\d.,-]/g, "")
            .replace(",", ".")
        );
  if (!Number.isFinite(n)) return "€0.00";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

export default function GuestOrderLookup() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [lookup, { data, isLoading, isError, error, isSuccess }] =
    useGuestLookupMutation();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !number) return;
    await lookup({ email, number })
      .unwrap()
      .catch(() => {});
  };

  const totalQty = useMemo(() => {
    if (!data?.items?.length) return 0;
    return data.items.reduce((s, it) => s + (it.quantity || 0), 0);
  }, [data]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">
        {t("order.lookup.title", "Find your order")}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {t(
          "order.lookup.lead",
          "Enter your email and order number to view your order details."
        )}
      </p>

      <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3 mb-8">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t(
            "order.lookup.emailPlaceholder",
            "Email used at checkout"
          )}
          className="border rounded px-3 py-2 md:col-span-1 dark:bg-marbleblack"
        />
        <input
          type="text"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={t(
            "order.lookup.numberPlaceholder",
            "Order number (e.g. MM-12345)"
          )}
          className="border rounded px-3 py-2 md:col-span-1 dark:bg-marbleblack"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-marbleblack text-white rounded px-4 py-2 md:col-span-1"
        >
          {isLoading
            ? t("common.loading", "Loading…")
            : t("order.lookup.search", "Search")}
        </button>
      </form>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-6">
          {error?.data?.detail ||
            t(
              "order.lookup.notFound",
              "Order not found. Please check your details."
            )}
        </div>
      )}

      {isSuccess && data && (
        <div className="rounded-lg border shadow-sm bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">
                {t("order.orderHash", "Order")} #{data.number}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(data.created_at).toLocaleString(locale)}
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
              {t(`order.status.${data.status}`, data.status)}
            </span>
          </div>

          <div className="mt-4 space-y-3 max-h-[55vh] overflow-auto pr-1">
            {data.items?.map((it) => (
              <div key={it.id} className="flex gap-3">
                {it.product?.image ? (
                  <img
                    src={it.product.image}
                    alt={
                      it.product?.title_en || it.product?.title_de || "Product"
                    }
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-100" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {it.product?.title_en ||
                      it.product?.title_de ||
                      t("order.item", "Item")}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t("order.qty", "Qty")}: {it.quantity} •{" "}
                    {t("order.unit", "Unit")}: {fmtMoney(it.unit_price, locale)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-3 grid grid-cols-2 gap-y-1 text-sm">
            <div className="text-gray-500">{t("order.items", "Items")}</div>
            <div className="text-right">{totalQty}</div>
            <div className="text-gray-500">
              {t("order.subtotal", "Subtotal")}
            </div>
            <div className="text-right">{fmtMoney(data.subtotal, locale)}</div>
            <div className="text-gray-500">
              {t("order.shipping", "Shipping")}
            </div>
            <div className="text-right">
              {fmtMoney(data.shipping_fee, locale)}
            </div>
            <div className="font-medium">{t("order.total", "Total")}</div>
            <div className="text-right font-semibold">
              {fmtMoney(data.total_price, locale)}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold mb-1">
              {t("order.shippingAddress", "Shipping address")}
            </div>
            {data.shipping_address ? (
              <div className="text-sm">
                {data.shipping_address.first_name}{" "}
                {data.shipping_address.last_name}
                <br />
                {data.shipping_address.address_line1}
                {data.shipping_address.address_line2
                  ? `, ${data.shipping_address.address_line2}`
                  : ""}
                <br />
                {data.shipping_address.postal_code} {data.shipping_address.city}
                <br />
                {data.shipping_address.country}
                {data.shipping_address.phone ? (
                  <>
                    <br />
                    {t("order.phone", "Phone")}: {data.shipping_address.phone}
                  </>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {t("order.noAddress", "No address on file")}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            {data.invoice_pdf ? (
              <a
                href={data.invoice_pdf}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded bg-black text-white"
              >
                {t("order.downloadInvoice", "Download invoice")}
              </a>
            ) : (
              <span className="text-xs text-gray-500">
                {t("order.invoicePending", "Invoice will be available soon.")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
