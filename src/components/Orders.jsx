// src/components/Orders.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetOrdersQuery } from "../features/orders/ordersApi";
import OrderDialog from "./OrderDialog";
import { toAbsoluteUrl } from "../utils/urls";

export default function Orders() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const lang = i18n.language.startsWith("de") ? "de" : "en";

  const { data: orders = [], isFetching, error } = useGetOrdersQuery();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const loc = useLocation();

  const fmtMoney = (v) => {
    let n =
      typeof v === "number"
        ? v
        : parseFloat(
            String(v)
              .replace(/[^\d.,-]/g, "")
              .replace(",", ".")
          );
    if (!Number.isFinite(n)) n = 0;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
      }).format(n);
    } catch {
      return `${n.toFixed(2)} €`;
    }
  };

  const fmtDateTime = (v) => {
    try {
      const d = new Date(v);
      return d.toLocaleString(locale);
    } catch {
      return String(v);
    }
  };

  const statusClass = (s) =>
    s === "delivered"
      ? "bg-green-100 text-green-700"
      : s === "shipped"
      ? "bg-blue-100 text-blue-700"
      : s === "processing"
      ? "bg-yellow-100 text-yellow-700"
      : s === "cancelled"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";

  const statusLabel = (s) =>
    t(`order.status.${s}`, s.charAt(0).toUpperCase() + s.slice(1));

  const productTitle = (p) =>
    (lang === "de" ? p?.title_de : p?.title_en) ||
    p?.title_en ||
    p?.title_de ||
    t("order.item");

  const resolveItemMeta = (item) => {
    const product =
      (item?.product && typeof item.product === "object" && item.product) ||
      item?.product_obj ||
      item?.product_data ||
      null;
    const fallbackTitle = item?.product_title || item?.title;
    const imageSource =
      product?.image ||
      product?.image_url ||
      product?.cover ||
      product?.thumbnail ||
      item?.image ||
      item?.product_image ||
      null;

    return {
      title: productTitle(product) || fallbackTitle || t("order.item"),
      image: toAbsoluteUrl(imageSource),
    };
  };

  if (error?.status === 401) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-backnewswhite dark:text-backnewsdark">
        <h2 className="text-3xl font-light mb-3">{t("auth.signInRequired")}</h2>
        <p className="text-gray-600 mb-6">{t("auth.signInToViewOrders")}</p>
        <Link
          to={`/login?next=${next}`}
          className="inline-block bg-black text-white px-5 py-2 rounded"
        >
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-backnewswhite dark:text-backnewsdark">
      <div className="flex items-center justify-between mb-8 ">
        <h2 className="text-2xl font-light mb-8">{t("order.yourOrders")}</h2>
        <Link to="/account" className="p-6 hover:underline">
          <h6 className="text-xl font-light mb-8">{t("backtoAccount")}</h6>
        </Link>
        <span className="text-sm text-gray-500">
          {t("order.count", { count: orders.length })}
        </span>
      </div>

      {isFetching ? (
        <div className="text-gray-500">{t("common.loading")}</div>
      ) : orders.length === 0 ? (
        <div className="text-gray-400">{t("order.none")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
          {orders.map((o) => {
            const primaryMeta = resolveItemMeta(o.items?.[0] || {});
            const itemCount = o.items?.length || 0;
            return (
              <button
                key={o.id}
                onClick={() => {
                  setSelectedId(o.id);
                  setOpen(true);
                }}
                className="bg-white text-left p-4 rounded shadow hover:shadow-md transition  dark:bg-marbleblack"
              >
                <div className="flex gap-3">
                  {primaryMeta.image ? (
                    <img
                      src={primaryMeta.image}
                      alt={primaryMeta.title}
                      className="w-20 h-20 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded bg-gray-100 dark:bg-gray-800"
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="font-semibold leading-tight line-clamp-2">
                        {primaryMeta.title}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${statusClass(
                          o.status
                        )}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-500">
                      {fmtDateTime(o.created_at)}
                    </div>

                    <div className="text-sm">
                      {t("order.total")}: {fmtMoney(o.total_price)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t("order.itemsCount", { count: itemCount })}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && selectedId !== null && (
        <OrderDialog orderId={selectedId} open onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
