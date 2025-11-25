// src/components/Orders.jsx
import { useMemo, useState } from "react";
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
      if (Number.isNaN(d.getTime())) return String(v);
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
    s
      ? t(`order.status.${s}`, s.charAt(0).toUpperCase() + s.slice(1))
      : t("order.status.unknown", "Unknown");

  const productTitle = (p) =>
    (lang === "de" ? p?.title_de : p?.title_en) ||
    p?.title_en ||
    p?.title_de ||
    p?.name ||
    t("order.item");

  const resolveItemMeta = (order = {}, item = {}) => {
    const product =
      (item?.product && typeof item.product === "object" && item.product) ||
      item?.product_obj ||
      item?.product_data ||
      null;
    const fallbackTitle =
      item?.product_name || item?.product_title || item?.title || item?.name;

    const productImages = Array.isArray(product?.images)
      ? product.images
      : Array.isArray(product?.photos)
      ? product.photos
      : [];

    const itemImages = Array.isArray(item?.images)
      ? item.images
      : Array.isArray(item?.photos)
      ? item.photos
      : [];

    const imageSource =
      product?.image ||
      product?.image_url ||
      product?.cover ||
      product?.thumbnail ||
      product?.featured_image ||
      productImages[0] ||
      item?.image ||
      item?.product_image ||
      item?.product_image_url ||
      item?.image_url ||
      itemImages[0] ||
      item?.thumbnail ||
      item?.thumbnail_url ||
      order?.first_item_image ||
      order?.primary_image ||
      order?.preview_image ||
      order?.cover_image ||
      order?.thumbnail ||
      null;

    const title = product
      ? productTitle(product)
      : fallbackTitle || t("order.item");

    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const initial = normalizedTitle
      ? normalizedTitle.charAt(0).toUpperCase()
      : null;

    return {
      title,
      image: toAbsoluteUrl(imageSource),
      initial,
    };
  };

  const getItemsCountLabel = (count) => {
    const translated = t("order.itemsCount", { count });
    if (translated === "order.itemsCount") {
      const single = t("order.item", "Item");
      const plural = t("order.itemsLabel", "Items");
      const word = count === 1 ? single : plural;
      return `${count} ${word}`.trim();
    }
    return translated;
  };

  // 🔹 NEW: group orders by year and month
  const grouped = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o?.created_at) return;
      const d = new Date(o.created_at);
      if (Number.isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const monthIndex = d.getMonth(); // 0–11

      if (!map[year]) map[year] = {};
      if (!map[year][monthIndex]) map[year][monthIndex] = [];
      map[year][monthIndex].push(o);
    });

    // convert to sorted array [{ year, months: [{monthIndex, label, orders}] }]
    const years = Object.keys(map)
      .map((y) => parseInt(y, 10))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a); // latest year first

    return years.map((year) => {
      const monthsMap = map[year];
      const monthIndices = Object.keys(monthsMap)
        .map((m) => parseInt(m, 10))
        .filter((m) => !Number.isNaN(m))
        .sort((a, b) => b - a); // latest month first

      const months = monthIndices.map((mi) => {
        const label = new Date(year, mi, 1).toLocaleDateString(locale, {
          month: "long",
          year: "numeric",
        });
        return {
          monthIndex: mi,
          label,
          orders: monthsMap[mi],
        };
      });

      return { year, months };
    });
  }, [orders, locale]);

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-2xl font-light text-backnewswhite dark:text-backnewsdark">
            {t("order.yourOrders")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            {t("order.count", { count: orders.length })}
          </p>
        </div>
        <Link
          to="/account"
          className="text-sm sm:text-base hover:underline text-backnewswhite dark:text-backnewsdark"
        >
          {t("backtoAccount")}
        </Link>
      </div>

      {/* Content */}
      {isFetching ? (
        <div className="text-gray-500">{t("common.loading")}</div>
      ) : orders.length === 0 ? (
        <div className="text-gray-400">{t("order.none")}</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ year, months }) => (
            <section key={year} className="space-y-4">
              {/* Year heading */}
              <h3 className="text-xl font-semibold text-backnewswhite dark:text-backnewsdark">
                {year}
              </h3>

              {months.map(({ monthIndex, label, orders: monthOrders }) => (
                <div key={`${year}-${monthIndex}`} className="space-y-3">
                  {/* Month heading */}
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                  </h4>

                  {/* Orders grid for this month */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {monthOrders.map((o) => {
                      const primaryMeta = resolveItemMeta(
                        o,
                        o.items?.[0] || {}
                      );
                      const itemCount = o.items?.length || 0;
                      return (
                        <button
                          key={o.id}
                          onClick={() => {
                            setSelectedId(o.id);
                            setOpen(true);
                          }}
                          className="w-full bg-marblewhite dark:bg-marbleblack text-left p-4 rounded shadow hover:shadow-md transition"
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
                                className="w-20 h-20 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
                                aria-hidden="true"
                              >
                                {primaryMeta.initial || "?"}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold leading-tight line-clamp-2">
                                  {primaryMeta.title}
                                </div>
                                <span
                                  className={`text-xs px-2 py-1 rounded whitespace-nowrap ${statusClass(
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
                                {getItemsCountLabel(itemCount)}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {open && selectedId !== null && (
        <OrderDialog orderId={selectedId} open onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
