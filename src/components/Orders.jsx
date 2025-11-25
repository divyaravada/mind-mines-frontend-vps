// src/components/Orders.jsx
import { useMemo, useState, useEffect } from "react";
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

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null); // 1–12
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

  // ---- Year / month grouping ----
  const grouped = useMemo(() => {
    const map = {}; // { [year]: { [month]: orders[] } }
    (orders || []).forEach((o) => {
      const d = new Date(o.created_at);
      if (!o.created_at || Number.isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1–12
      if (!map[year]) map[year] = {};
      if (!map[year][month]) map[year][month] = [];
      map[year][month].push(o);
    });
    return map;
  }, [orders]);

  const years = useMemo(
    () =>
      Object.keys(grouped)
        .map((y) => Number(y))
        .sort((a, b) => b - a), // latest year first
    [grouped]
  );

  // choose default year + month when data changes
  useEffect(() => {
    if (!years.length) {
      setSelectedYear(null);
      setSelectedMonth(null);
      return;
    }

    // if no year selected yet, pick latest year
    if (!selectedYear || !grouped[selectedYear]) {
      const year = years[0];
      setSelectedYear(year);

      const months = Object.keys(grouped[year])
        .map((m) => Number(m))
        .sort((a, b) => b - a); // latest month first
      setSelectedMonth(months[0] || null);
      return;
    }

    // if year exists but month not valid anymore, reset month
    if (selectedYear && grouped[selectedYear]) {
      const months = Object.keys(grouped[selectedYear])
        .map((m) => Number(m))
        .sort((a, b) => b - a);
      if (!selectedMonth || !months.includes(selectedMonth)) {
        setSelectedMonth(months[0] || null);
      }
    }
  }, [grouped, years, selectedYear, selectedMonth]);

  const monthsForYear = useMemo(() => {
    if (!selectedYear || !grouped[selectedYear]) return [];
    return Object.keys(grouped[selectedYear])
      .map((m) => Number(m))
      .sort((a, b) => b - a); // latest first
  }, [grouped, selectedYear]);

  const monthLabel = (monthNum) => {
    // monthNum: 1–12
    try {
      const d = new Date(2025, monthNum - 1, 1);
      return d.toLocaleString(locale, { month: "long" });
    } catch {
      // fallback EN
      const names = [
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return names[monthNum] || `Month ${monthNum}`;
    }
  };

  const filteredOrders = useMemo(() => {
    if (!selectedYear || !selectedMonth) return orders || [];
    const subset = grouped[selectedYear]?.[selectedMonth] || [];
    // keep same order as backend: no extra sorting here
    return subset;
  }, [grouped, orders, selectedYear, selectedMonth]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h2 className="text-2xl font-light text-backnewswhite dark:text-backnewsdark">
            {t("order.yourOrders")}
          </h2>
          <p className="text-xs text-gray-500">
            {t("order.count", { count: orders.length })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/account"
            className="text-sm hover:underline text-gray-700 dark:text-gray-200"
          >
            {t("backtoAccount")}
          </Link>
        </div>
      </div>

      {/* Year / Month filters */}
      {orders.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Years */}
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
              {t("order.filterYear", "Year")}
            </div>
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setSelectedYear(year);
                    const months = Object.keys(grouped[year])
                      .map((m) => Number(m))
                      .sort((a, b) => b - a);
                    setSelectedMonth(months[0] || null);
                  }}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    selectedYear === year
                      ? "bg-backnewswhite text-white border-backnewswhite"
                      : "bg-white dark:bg-marbleblack border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Months for selected year */}
          {selectedYear && monthsForYear.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                {t("order.filterMonth", "Month")}{" "}
                <span className="text-[10px] text-gray-400 ml-1">
                  ({selectedYear})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {monthsForYear.map((m) => (
                  <button
                    key={`${selectedYear}-${m}`}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3 py-1 rounded-full border text-xs sm:text-sm ${
                      selectedMonth === m
                        ? "bg-backnewswhite text-white border-backnewswhite"
                        : "bg-white dark:bg-marbleblack border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {monthLabel(m)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Small info text */}
          {selectedYear && selectedMonth && (
            <p className="text-xs text-gray-500">
              {t("order.filterActive", {
                year: selectedYear,
                month: monthLabel(selectedMonth),
              })}
            </p>
          )}
        </div>
      )}

      {/* Orders list */}
      {isFetching ? (
        <div className="text-gray-500">{t("common.loading")}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-gray-400">{t("order.none")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((o) => {
            const primaryMeta = resolveItemMeta(o, o.items?.[0] || {});
            const itemCount = o.items?.length || 0;
            return (
              <button
                key={o.id}
                onClick={() => {
                  setSelectedId(o.id);
                  setOpen(true);
                }}
                className="bg-marblewhite dark:bg-marbleblack text-left p-4 rounded shadow hover:shadow-md transition"
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
      )}

      {open && selectedId !== null && (
        <OrderDialog orderId={selectedId} open onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
