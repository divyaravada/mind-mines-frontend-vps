// src/components/Wishlist.jsx  (component name kept: AccountWishlist)
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
import { fmtEUR, resolveProductPrice } from "../lib/money";

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
  } = useGetWishlistQuery(undefined, {
    skip: !isLoggedIn,
  });

  const [removeWishlist] = useRemoveFromWishlistMutation();
  const [triggerGetProduct] = useLazyGetProductQuery();

  const items = useMemo(() => {
    if (Array.isArray(itemsRaw)) return itemsRaw;
    if (Array.isArray(itemsRaw?.results)) return itemsRaw.results;
    return [];
  }, [itemsRaw]);

  const [products, setProducts] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        results.forEach((p) => p?.id && (map[p.id] = p));
      }
      if (!cancelled) setProducts(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [items, triggerGetProduct, isLoggedIn]);

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

  const Shell = ({ children }) => (
    <div className="max-w-6xl mx-auto px-6 py-16 text-gray-900 dark:text-gray-100">
      {children}
    </div>
  );

  if (!isLoggedIn) {
    return (
      <Shell>
        <h1 className="text-2xl font-light mb-4 text-backnewswhite dark:text-backnewsdark">
          {t("wishlist.title", "Your Wishlist")}
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-300">
          {t(
            "wishlist.loginPrompt",
            "Please log in to view and manage your wishlist."
          )}
        </p>
        <Link
          to="/login"
          className="inline-block bg-backnewswhite text-white dark:text-marblewhite px-6 py-3 rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-backnewswhite/50"
        >
          {t("wishlist.goToLogin", "Go to Login")}
        </Link>
      </Shell>
    );
  }

  if (isFetching) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-300 py-16">
        {t("common.loading", "Loading…")}
      </div>
    );
  }

  if (isError) {
    return (
      <Shell>
        <h1 className="text-2xl font-light mb-4 text-backnewswhite dark:text-backnewsdark">
          {t("wishlist.title", "Your Wishlist")}
        </h1>
        <p className="mb-8 text-red-600 dark:text-red-400">
          {t(
            "wishlist.loadError",
            "We couldn't load your wishlist right now. Please try again later."
          )}
        </p>
        <Link
          to="/decorative-products"
          className="inline-block bg-backnewswhite text-white px-6 py-3 rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-backnewswhite/50"
        >
          {t("wishlist.startShopping", "Start shopping")}
        </Link>
      </Shell>
    );
  }

  if (!list.length) {
    return (
      <Shell>
        <h1 className="text-2xl font-light mb-4 text-backnewswhite dark:text-backnewsdark">
          {t("wishlist.emptyTitle")}
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-300">
          {t("wishlist.emptySubtitle")}
        </p>
        <Link
          to="/decorative-products"
          className="inline-block bg-backnewswhite text-white px-6 py-3 rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-backnewswhite/50"
        >
          {t("wishlist.startShopping", "Start shopping")}
        </Link>
      </Shell>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-light text-backnewswhite dark:text-backnewsdark">
            {t("wishlist.title", "Your Wishlist")}
          </h1>
          <span className="text-sm text-gray-600 dark:text-gray-300 block mt-1">
            {t("wishlist.count", { count: list.length })}
          </span>
        </div>

        <Link
          to="/account"
          className="text-sm underline underline-offset-4 md:ml-auto text-backnewswhite dark:text-backnewsdark"
        >
          <h6 className="text-xl font-light">
            {t("backtoAccount", "Back to Account")}
          </h6>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {list.map(({ w, p }) => {
          const title = p[`title_${lang}`] || p.title_en || "";
          return (
            <div
              key={w.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-marblewhite dark:bg-neutral-900 shadow-sm relative"
            >
              <button
                className="absolute top-2 right-2 text-red-500 text-xl focus:outline-none focus:ring-2 focus:ring-red-300/50 rounded"
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

              {p.image && (
                <img
                  src={p.image}
                  alt={title}
                  className="w-full h-44 object-cover rounded mb-3 cursor-pointer"
                  onClick={() => navigate(`/products/${p.id}`)}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}

              <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>

              <div className="text-gray-700 dark:text-gray-300 text-sm mt-1">
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
