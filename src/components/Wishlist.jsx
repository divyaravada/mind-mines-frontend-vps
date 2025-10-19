// src/components/Wishlist.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { useLazyGetProductQuery } from "../features/products/productsApi";
import {
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";

const fmtMoney = (v, locale = "en") => {
  let n =
    typeof v === "number"
      ? v
      : parseFloat(
          String(v ?? "")
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

export default function AccountWishlist() {
  const { i18n, t } = useTranslation();
  const locale = i18n.language || "en";
  const lang = locale.startsWith("de") ? "de" : "en";
  const navigate = useNavigate();

  const { data: items = [], isFetching } = useGetWishlistQuery();
  const [removeWishlist] = useRemoveFromWishlistMutation();
  const [triggerGetProduct] = useLazyGetProductQuery();

  const [products, setProducts] = useState({});

  useEffect(() => {
    let cancelled = false;
    const loadMissing = async () => {
      const map = {};
      items.forEach((w) => {
        if (w.product_obj) map[w.product_obj.id] = w.product_obj;
      });
      const missing = items.map((w) => w.product).filter((id) => !map[id]);
      if (missing.length) {
        const results = await Promise.all(
          missing.map((id) =>
            triggerGetProduct(id)
              .unwrap()
              .catch(() => null)
          )
        );
        results.forEach((p) => {
          if (p && p.id) map[p.id] = p;
        });
      }
      if (!cancelled) setProducts(map);
    };
    loadMissing();
    return () => {
      cancelled = true;
    };
  }, [items, triggerGetProduct]);

  const count = items.length;
  const list = useMemo(
    () =>
      items
        .map((w) => {
          const p = products[w.product];
          return p ? { w, p } : null;
        })
        .filter(Boolean),
    [items, products]
  );

  if (isFetching) {
    return (
      <div className="text-center text-gray-500 py-16">
        {t("common.loading", "Loading…")}
      </div>
    );
  }

  if (!count) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-backnewswhite dark:text-backnewsdark ">
        <h1 className="text-2xl font-light mb-4">{t("wishlist.emptyTitle")}</h1>
        <p className="mb-8 text-gray-600">{t("wishlist.emptySubtitle")}</p>
        <Link
          to="/decorative-products"
          className="inline-block bg-black text-white px-8 py-4 rounded"
        >
          {t("wishlist.startShopping", "Start shopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-backnewswhite dark:text-backnewsdark ">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-light mb-8">
          {t("wishlist.title", "Your Wishlist")}
        </h1>
        <Link to="/account" className="p-6 hover:underline">
          <h6 className="text-xl font-light mb-8">
            {t("backtoAccount", "Back to Account")}
          </h6>
        </Link>
        <span className="text-sm text-gray-500">
          {t("wishlist.count", { count })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {list.map(({ w, p }) => {
          const title = p[`title_${lang}`] || p.title_en || "";
          return (
            <div
              key={w.id}
              className="p-4 border rounded-xl bg-white shadow-sm relative"
            >
              <button
                className="absolute top-2 right-2 text-red-500 text-xl"
                onClick={async () => {
                  await removeWishlist(p.id).unwrap();
                  toast.info(
                    t("wishlist.removedToast", "Removed from wishlist")
                  );
                }}
                aria-label={t("wishlist.removeAria", "Remove from wishlist")}
                title={t("wishlist.remove", "Remove")}
              >
                ✕
              </button>

              <img
                src={p.image}
                alt={title}
                className="w-full h-44 object-cover rounded mb-3 cursor-pointer"
                onClick={() => navigate(`/decorative-products/${p.id}`)}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>
              <div className="text-gray-600 text-sm mt-1">
                {t("wishlist.price", "Price")}: {fmtMoney(p.vat_price, locale)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
