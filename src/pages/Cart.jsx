// src/pages/Cart.jsx
import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
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
import { useGetCartQuery, useSaveCartMutation } from "../features/cart/cartApi";
import { resolveUnitGross } from "../lib/pricing";

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
import { Helmet } from "react-helmet-async";
import { getCartToken } from "../lib/cartToken";

/**
 * Stable debounced callback (doesn't change identity each render)
 * and doesn't capture stale fn.
 */
function useDebouncedCallback(fn, ms = 500) {
  const fnRef = useRef(fn);
  const timerRef = useRef(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => fnRef.current(...args), ms);
    },
    [ms],
  );

  // cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return debounced;
}

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const items = useSelector(selectCartItems, shallowEqual);
  const count = useSelector(selectCartCount);
  const loggedIn = useSelector((s) => Boolean(s.auth?.access));

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const handleCheckoutClick = () => {
    if (loggedIn) {
      navigate("/checkout");
    } else {
      setShowCheckoutModal(true);
    }
  };

  const continueAsGuest = () => {
    setShowCheckoutModal(false);
    navigate("/checkout");
  };

  const signupForDiscount = () => {
    setShowCheckoutModal(false);

    const redirect = "/checkout";

    // Your Login route is /users/login
    // You can read these params in Login and apply coupon later (optional)
    navigate(`/users/login?next=${encodeURIComponent(redirect)}`);
  };

  // ✅ IMPORTANT: call getCart so onQueryStarted can merge server cart on refresh
  const cart_token = useMemo(() => getCartToken(), []);
  useGetCartQuery({ cart_token });

  const { data: wl } = useGetWishlistQuery(undefined, { skip: !loggedIn });

  const wishlistIds = useMemo(() => {
    const list = Array.isArray(wl)
      ? wl
      : Array.isArray(wl?.results)
        ? wl.results
        : [];
    return new Set(list.map((w) => Number(w.product)));
  }, [wl]);

  const [addW] = useAddToWishlistMutation();
  const [remW] = useRemoveFromWishlistMutation();

  // 🔹 Ensure Redux qty never exceeds stock
  useEffect(() => {
    for (const it of items) {
      const stockNum = Number(it.stock);
      const maxQty =
        Number.isFinite(stockNum) && stockNum > 0 ? stockNum : null;
      const current = it.qty || 1;

      const clamped =
        maxQty === null
          ? Math.max(1, current)
          : Math.min(Math.max(1, current), maxQty);

      if (clamped !== current) {
        dispatch(updateQty({ id: it.id, qty: clamped }));
      }
    }
  }, [items, dispatch]);

  // Backend sync
  const [saveCart] = useSaveCartMutation();

  const syncNow = useDebouncedCallback(async (payload) => {
    try {
      await saveCart(payload).unwrap();
    } catch {
      /* silent */
    }
  }, 500);

  // Build payload once (memo) so effect doesn't re-run unnecessarily
  const cartBody = useMemo(() => {
    const itemsPayload = items.map((it) => {
      const unitPrice = resolveUnitGross(it, { couponApplied: false });

      const stockNum = Number(it.stock);
      const maxQty =
        Number.isFinite(stockNum) && stockNum > 0 ? stockNum : null;

      let qty = it.qty || 1;
      qty =
        maxQty === null ? Math.max(1, qty) : Math.min(Math.max(1, qty), maxQty);

      return {
        product: it.productId ?? it.id,
        name: it.name,
        image: it.image,
        price: unitPrice.toFixed(2),
        qty,
        color: it.color || "",
        weight: it.weight || "",
        dimensions: it.dimensions || "",
        category: it.category || "",
        stock: Number.isFinite(stockNum) ? stockNum : undefined,
      };
    });

    return { cart_token, currency: "EUR", items: itemsPayload };
  }, [items, cart_token]);

  useEffect(() => {
    syncNow(cartBody);
  }, [cartBody, syncNow]);

  // Subtotal uses clamped qty as well
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const unitPrice = resolveUnitGross(item, { couponApplied: false });

      const stockNum = Number(item.stock);
      const maxQty =
        Number.isFinite(stockNum) && stockNum > 0 ? stockNum : null;
      let qty = item.qty || 1;
      qty =
        maxQty === null ? Math.max(1, qty) : Math.min(Math.max(1, qty), maxQty);
      return sum + unitPrice * qty;
    }, 0);
  }, [items]);

  const shippingFee = 0;
  const total = subtotal + shippingFee;

  const toggleWishlist = useCallback(
    async (productId) => {
      if (!loggedIn) return;
      try {
        if (wishlistIds.has(productId)) {
          await remW(productId).unwrap();
        } else {
          await addW(productId).unwrap();
        }
      } catch {
        /* silent */
      }
    },
    [loggedIn, wishlistIds, addW, remW],
  );

  if (items.length === 0) {
    return (
      <main className="max-w-5xl mx-auto py-12 px-4 text-gray-900 dark:text-gray-100">
        <Helmet>
          <meta name="robots" content="noindex,nofollow" />
          <meta name="googlebot" content="noindex,nofollow" />
          <title>Cart | MindMines</title>
        </Helmet>
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
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
        <title>Cart | MindMines</title>
      </Helmet>
      {/* ✅ main landmark fixes “Document does not have a main landmark” */}
      <main className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 text-gray-900 dark:text-gray-100">
        {/* LEFT */}
        <section className="lg:col-span-2" aria-label="Cart items">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t("cart.title_one")} ({count}{" "}
              {count === 1 ? t("cart.item") : t("cart.items")})
            </h1>

            <button
              onClick={() => dispatch(clearCart())}
              className="text-red-700 hover:underline flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-300/50 rounded"
            >
              <Trash2 className="w-4 h-4" />
              {t("cart.clear")}
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const inWishlist = wishlistIds.has(item.id);

              const unitPrice = resolveUnitGross(item, {
                couponApplied: false,
              });

              const stockNum = Number(item.stock);
              const maxQty =
                Number.isFinite(stockNum) && stockNum > 0 ? stockNum : null;

              let effectiveQty = item.qty || 1;
              effectiveQty =
                maxQty === null
                  ? Math.max(1, effectiveQty)
                  : Math.min(Math.max(1, effectiveQty), maxQty);

              const lineTotal = unitPrice * effectiveQty;
              const disablePlus = maxQty !== null && effectiveQty >= maxQty;

              return (
                <article
                  key={item.id}
                  className="bg-marblewhite dark:bg-neutral-900 rounded-xl shadow p-4 flex gap-4 border border-gray-200 dark:border-gray-800"
                >
                  {/* ✅ reduce layout shift: width/height + aspect square */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-28 h-28 aspect-square object-cover rounded"
                    width="112"
                    height="112"
                    loading="lazy"
                    decoding="async"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-lg">{item.name}</h2>
                        {item.category && (
                          <div className="text-sm text-gray-600 dark:text-gray-200 capitalize">
                            {item.category}
                          </div>
                        )}
                        <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                          {fmtEUR(unitPrice, locale)} / {t("cart.piece")}
                        </div>
                        {Number.isFinite(stockNum) && stockNum > 0 && (
                          <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                            {t("cart.stockInfo", {
                              stock: stockNum,
                              defaultValue: "Max. {{stock}} piece(s) available",
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => dispatch(removeItem(item.id))}
                        className="text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300/50 rounded"
                        title={t("cart.remove")}
                        aria-label={t("cart.remove")}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-700 dark:text-gray-200">
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
                          <span className="font-medium">
                            {t("cart.weight")}:
                          </span>{" "}
                          <span>{item.weight}</span>
                        </div>
                      )}
                      {item.color && (
                        <div className="capitalize">
                          <span className="font-medium">
                            {t("cart.color")}:
                          </span>{" "}
                          <span>{item.color}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">
                          {t("cart.delivery")}:
                        </span>{" "}
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
                                  qty: Math.max(1, effectiveQty - 1),
                                }),
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
                            max={maxQty ?? undefined}
                            value={effectiveQty}
                            onChange={(e) => {
                              const raw = Number(e.target.value || 1);
                              let next = Math.max(1, raw);
                              if (maxQty !== null)
                                next = Math.min(next, maxQty);
                              dispatch(updateQty({ id: item.id, qty: next }));
                            }}
                            className="w-12 text-center outline-none p-1 bg-transparent"
                            aria-label={t("cart.quantity")}
                          />

                          <button
                            className="px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-r disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() =>
                              !disablePlus &&
                              dispatch(
                                updateQty({
                                  id: item.id,
                                  qty: effectiveQty + 1,
                                }),
                              )
                            }
                            disabled={disablePlus}
                            aria-label={t("cart.increaseQty")}
                            title={t("cart.increaseQty")}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          className={`rounded p-2 ${
                            inWishlist ? "text-red-600" : "text-gray-500"
                          } ${
                            !loggedIn
                              ? "opacity-50 cursor-not-allowed"
                              : "focus:outline-none focus:ring-2 focus:ring-black/20"
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
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          {t("cart.total")}
                        </div>
                        <div className="text-lg font-semibold">
                          {fmtEUR(lineTotal, locale)}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 bg-marblewhite dark:bg-neutral-900 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
            <div className="text-sm text-gray-700 dark:text-gray-200 mb-3">
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
        </section>

        {/* RIGHT */}
        <aside className="lg:col-span-1" aria-label="Order summary">
          <div className="bg-marblewhite dark:bg-neutral-900 rounded-xl shadow p-6 sticky top-24 border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold mb-4">{t("cart.summary")}</h2>

            <div className="space-y-3 text-sm">
              <Row
                label={t("cart.subtotal")}
                value={fmtEUR(subtotal, locale)}
              />
              <Row
                label={t("cart.shippingFee")}
                value={
                  shippingFee === 0
                    ? t("cart.free")
                    : fmtEUR(shippingFee, locale)
                }
              />
              <hr className="border-gray-200 dark:border-gray-800" />
              <Row
                label={<span className="font-semibold">{t("cart.total")}</span>}
                value={
                  <span className="font-semibold">{fmtEUR(total, locale)}</span>
                }
              />
              <div className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                {t("cart.inclTax")}
              </div>
            </div>

            <button
              onClick={handleCheckoutClick}
              className="mt-5 w-full inline-flex items-center justify-center py-3 rounded-xl bg-black text-white font-semibold hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-black/30"
            >
              {t("cart.checkout")}
            </button>

            <div className="mt-6 space-y-3 text-sm text-gray-800 dark:text-gray-200">
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
      </main>

      {/* ✅ Checkout modal for guests */}
      {showCheckoutModal && (
        <CheckoutChoiceModal
          onClose={() => setShowCheckoutModal(false)}
          onGuest={continueAsGuest}
          onSignup={signupForDiscount}
        />
      )}
    </>
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

function CheckoutChoiceModal({ onClose, onGuest, onSignup }) {
  // close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
          {/* header */}
          <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Continue to Checkout
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Want a discount? Create a MindMines account and get a{" "}
                  <span className="font-semibold text-backnewswhite">
                    15% coupon
                  </span>
                  .
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* body */}
          <div className="p-6 space-y-4">
            <div className="rounded-xl bg-gray-50 dark:bg-neutral-800/60 p-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Option 1 — Sign up & get 15% OFF
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                You’ll get a coupon after signup and continue to checkout.
              </div>
              <button
                onClick={onSignup}
                className="mt-3 w-full inline-flex items-center justify-center rounded-xl bg-backnewswhite text-white font-semibold py-3 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite/50"
              >
                Sign up & Continue (15% OFF)
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-neutral-800 p-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Option 2 — Continue as Guest
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Checkout without creating an account.
              </div>
              <button
                onClick={onGuest}
                className="mt-3 w-full inline-flex items-center justify-center rounded-xl bg-black text-white font-semibold py-3 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/30"
              >
                Continue as Guest
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              You can always create an account later from “My Account”.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
