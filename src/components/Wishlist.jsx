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
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { resolveProductPrice } from "../lib/money";

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

  const isLoggedIn = useSelector(selectIsAuthenticated);

  const {
    data: itemsRaw,
    isFetching,
    isError,
    error,
  } = useGetWishlistQuery(undefined, { skip: !isLoggedIn });

  const [removeWishlist] = useRemoveFromWishlistMutation();
  const [triggerGetProduct] = useLazyGetProductQuery();

  // normalize wishlist array shape
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
    : Array.isArray(itemsRaw?.results)
    ? itemsRaw.results
    : [];

  const [products, setProducts] = useState({});

  useEffect(() => {
    let cancelled = false;
    const loadMissing = async () => {
      if (!isLoggedIn) return;

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
  }, [items, triggerGetProduct, isLoggedIn]);

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

  // 1. Guest user: don't even try API, just show message
  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-backnewswhite dark:text-backnewsdark ">
        <h1 className="text-2xl font-light mb-4">
          {t("wishlist.title", "Your Wishlist")}
        </h1>
        <p className="mb-8 text-gray-600">
          {t(
            "wishlist.loginPrompt",
            "Please log in to view and manage your wishlist."
          )}
        </p>
        <Link
          to="/login"
          className="inline-block bg-black text-white px-8 py-4 rounded"
        >
          {t("wishlist.goToLogin", "Go to Login")}
        </Link>
      </div>
    );
  }

  // 2. Loading (user is logged in, we are fetching)
  if (isFetching) {
    return (
      <div className="text-center text-gray-500 py-16">
        {t("common.loading", "Loading…")}
      </div>
    );
  }

  // 3. Backend threw 500 / parse error
  if (isError) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-backnewswhite dark:text-backnewsdark ">
        <h1 className="text-2xl font-light mb-4">
          {t("wishlist.title", "Your Wishlist")}
        </h1>
        <p className="mb-8 text-red-600">
          {t(
            "wishlist.loadError",
            "We couldn't load your wishlist right now. Please try again later."
          )}
        </p>
        <Link
          to="/decorative-products"
          className="inline-block bg-black text-white px-8 py-4 rounded"
        >
          {t("wishlist.startShopping", "Start shopping")}
        </Link>
      </div>
    );
  }

  // 4. Empty wishlist
  if (!list.length) {
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-light">
            {t("wishlist.title", "Your Wishlist")}
          </h1>
          <span className="text-sm text-gray-500 block mt-1">
            {t("wishlist.count", { count: list.length })}
          </span>
        </div>

        <Link
          to="/account"
          className="text-sm underline underline-offset-4 md:ml-auto"
        >
          <h6 className="text-xl font-light">
            {t("backtoAccount", "Back to Account")}
          </h6>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {list.map(({ w, p }) => {
          const title = p[`title_${lang}`] || p.title_en || "";
          return (
            <div
              key={w.id}
              className="p-4 border rounded-xl bg-white shadow-sm relative"
            >
              {/* remove button */}
              <button
                className="absolute top-2 right-2 text-red-500 text-xl"
                onClick={async () => {
                  try {
                    await removeWishlist(p.id).unwrap();
                    toast.info(
                      t("wishlist.removedToast", "Removed from wishlist")
                    );
                  } catch {
                    toast.error(
                      t(
                        "wishlist.removeFailed",
                        "Couldn't remove from wishlist."
                      )
                    );
                  }
                }}
                aria-label={t("wishlist.removeAria", "Remove from wishlist")}
                title={t("wishlist.remove", "Remove")}
              >
                ✕
              </button>

              {/* product image */}
              {p.image && (
                <img
                  src={p.image}
                  alt={title}
                  className="w-full h-44 object-cover rounded mb-3 cursor-pointer"
                  onClick={() => navigate(`/products/${p.id}`)}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              {/* product title */}
              <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>

              {/* product price */}
              <div className="text-gray-600 text-sm mt-1">
                {t("wishlist.price", "Price")}:{" "}
                {fmtEUR(resolveProductPrice(p), locale)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
