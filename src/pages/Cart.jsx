// src/pages/Cart.jsx
import { useMemo, useCallback, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  selectCartItems,
  selectCartCount,
  removeItem,
  updateQty,
  clearCart,
} from "../features/cart/cartSlice";
import {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";
import { useSaveCartMutation } from "../features/cart/cartApi";
import { getCartToken } from "../lib/cartToken";

import {
  Heart,
  HeartOff,
  Minus,
  Plus,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { fmtEUR } from "../lib/money";

function useDebounce(fn, ms = 500) {
  const t = useRef();
  return (...args) => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => fn(...args), ms);
  };
}

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const loggedIn = useSelector((s) => Boolean(s.auth?.access));

  const { data: wl } = useGetWishlistQuery(undefined, { skip: !loggedIn });
  const wishlistIds = useMemo(() => {
    const list = Array.isArray(wl)
      ? wl
      : Array.isArray(wl?.results)
      ? wl.results
      : [];
    return list.map((w) => Number(w.product));
  }, [wl]);

  const [addW] = useAddToWishlistMutation();
  const [remW] = useRemoveFromWishlistMutation();

  // Backend sync
  const [saveCart] = useSaveCartMutation();
  const syncNow = useDebounce(async (payload) => {
    try {
      await saveCart(payload).unwrap();
    } catch {
      /* silent */
    }
  }, 500);

  useEffect(() => {
    const cart_token = getCartToken();
    const itemsPayload = items.map((it) => {
      // use price if > 0, otherwise priceRange
      const unitPrice =
        it.price && Number(it.price) > 0
          ? Number(it.price)
          : Number(it.priceRange ?? 0);

      return {
        product: it.id,
        name: it.name,
        image: it.image,
        price: unitPrice.toFixed(2),
        qty: it.qty,
        color: it.color || "",
        weight: it.weight || "",
        dimensions: it.dimensions || "",
        category: it.category || "",
      };
    });
    const body = { cart_token, currency: "EUR", items: itemsPayload };
    syncNow(body);
  }, [items, loggedIn, syncNow]);

  // 👉 compute subtotal here so it uses price/priceRange correctly
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const unitPrice =
        item.price && Number(item.price) > 0
          ? Number(item.price)
          : Number(item.priceRange ?? 0);

      const qty = item.qty || 1;
      return sum + unitPrice * qty;
    }, 0);
  }, [items]);

  // Shipping: currently free — keep as constant for now
  const shippingFee = 0;
  const total = subtotal + shippingFee;

  const toggleWishlist = useCallback(
    async (productId) => {
      if (!loggedIn) return;
      try {
        if (wishlistIds.includes(productId)) {
          await remW(productId).unwrap();
        } else {
          await addW(productId).unwrap();
        }
      } catch {
        /* silent */
      }
    },
    [loggedIn, wishlistIds, addW, remW]
  );

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-gray-900 dark:text-gray-100">
        <h1 className="text-2xl font-bold mb-4 text-backnewswhite dark:text-backnewsdark">
          {t("cart.title", { count: 0 })}
        </h1>
        <div className="bg-marblewhite dark:bg-neutral-900 rounded-xl shadow p-8 text-center border border-gray-200 dark:border-gray-800">
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            {t("cart.empty")}
          </p>
          <Link
            to="/decorative-products"
            className="inline-block px-5 py-3 rounded-xl bg-backnewswhite text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-backnewswhite/50"
          >
            {t("cart.continue")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 text-gray-900 dark:text-gray-100">
      {/* LEFT */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-backnewswhite dark:text-backnewsdark">
            {t("cart.title_one")} ({count}{" "}
            {count === 1 ? t("cart.item") : t("cart.items")})
          </h1>
          <button
            onClick={() => dispatch(clearCart())}
            className="text-red-600 hover:underline flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-300/50 rounded"
          >
            <Trash2 className="w-4 h-4" />
            {t("cart.clear")}
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => {
            const inWishlist = wishlistIds.includes(item.id);

            // unit price per item (same logic)
            const unitPrice =
              item.price && Number(item.price) > 0
                ? Number(item.price)
                : Number(item.priceRange ?? 0);

            const lineTotal = unitPrice * item.qty;

            return (
              <div
                key={item.id}
                className="bg-marblewhite dark:text-backnewsdark dark:bg-neutral-900 rounded-xl shadow p-4 flex gap-4 border border-gray-200 dark:border-gray-800"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-28 h-28 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.category && (
                        <div className="text-sm text-gray-500 dark:text-backnewsdark capitalize">
                          {item.category}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {fmtEUR(unitPrice, locale)} / {t("cart.piece")}
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch(removeItem(item.id))}
                      className="text-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300/50 rounded"
                      title={t("cart.remove")}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 dark:text-gray-300">
                    {item.dimensions && (
                      <div>
                        <span className="font-medium">
                          {t("cart.measurements")}:
                        </span>{" "}
                        <span>{item.dimensions}</span>
                      </div>
                    )}
                    {item.weight && (
                      <div>
                        <span className="font-medium">{t("cart.weight")}:</span>{" "}
                        <span>{item.weight}</span>
                      </div>
                    )}
                    {item.color && (
                      <div className="capitalize">
                        <span className="font-medium">{t("cart.color")}:</span>{" "}
                        <span>{item.color}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">{t("cart.delivery")}:</span>{" "}
                      <span>{t("cart.deliveryTime")}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded">
                        <button
                          className="px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-l"
                          onClick={() =>
                            dispatch(
                              updateQty({
                                id: item.id,
                                qty: Math.max(1, item.qty - 1),
                              })
                            )
                          }
                          aria-label={t("cart.decreaseQty")}
                          title={t("cart.decreaseQty")}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            dispatch(
                              updateQty({
                                id: item.id,
                                qty: Math.max(1, Number(e.target.value || 1)),
                              })
                            )
                          }
                          className="w-12 text-center outline-none p-1 bg-transparent"
                          aria-label={t("cart.quantity")}
                        />
                        <button
                          className="px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-r"
                          onClick={() =>
                            dispatch(
                              updateQty({ id: item.id, qty: item.qty + 1 })
                            )
                          }
                          aria-label={t("cart.increaseQty")}
                          title={t("cart.increaseQty")}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        className={`rounded p-2 ${
                          inWishlist ? "text-red-500" : "text-gray-400"
                        } ${
                          !loggedIn
                            ? "opacity-50 cursor-not-allowed"
                            : "focus:outline-none focus:ring-2 focus:ring-backnewswhite/40"
                        }`}
                        onClick={() => toggleWishlist(item.id)}
                        title={t("cart.wishlist")}
                        aria-label={t("cart.wishlist")}
                        disabled={!loggedIn}
                      >
                        {inWishlist ? (
                          <Heart className="w-5 h-5" />
                        ) : (
                          <HeartOff className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500 dark:text-backnewsdark">
                        {t("cart.total")}
                      </div>
                      <div className="text-lg font-semibold">
                        {fmtEUR(lineTotal, locale)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-marblewhite dark:bg-neutral-900 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {t("cart.weAccept")}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BrandBadge label="PayPal" />
            <BrandBadge label="Mastercard" />
            <BrandBadge label="VISA" />
            <BrandBadge label="Giropay" />
            <BrandBadge label="SEPA" />
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <aside className="lg:col-span-1">
        <div className="bg-marblewhite dark:bg-neutral-900 dark:text-backnewsdark rounded-xl shadow p-6 sticky top-24 border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4">{t("cart.summary")}</h2>
          <div className="space-y-3 text-sm">
            <Row label={t("cart.subtotal")} value={fmtEUR(subtotal, locale)} />
            <Row
              label={t("cart.shippingFee")}
              value={
                shippingFee === 0 ? t("cart.free") : fmtEUR(shippingFee, locale)
              }
            />
            <hr className="border-gray-200 dark:border-gray-800" />
            <Row
              label={<span className="font-semibold">{t("cart.total")}</span>}
              value={
                <span className="font-semibold">{fmtEUR(total, locale)}</span>
              }
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("cart.inclTax")}
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="mt-5 w-full inline-flex items-center justify-center py-3 rounded-xl bg-backnewswhite text-white font-semibold hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-backnewswhite/50"
          >
            {t("cart.checkout")}
          </button>

          <div className="mt-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <Badge
              icon={<ShieldCheck className="w-4 h-4" />}
              text={t("cart.badgeSecure")}
            />
            <Badge
              icon={<RotateCcw className="w-4 h-4" />}
              text={t("cart.badgeReturn")}
            />
            <Badge
              icon={<Truck className="w-4 h-4" />}
              text={t("cart.badgeDelivery")}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1 bg-gray-100 dark:bg-neutral-800 rounded">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function BrandBadge({ label }) {
  return (
    <div className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-marblewhite dark:bg-neutral-800 shadow-sm text-xs font-semibold">
      {label}
    </div>
  );
}
