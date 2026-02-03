import { Heart, ShoppingCart, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  fmtEUR,
  resolveProductPrice,
  resolveBaseGross,
  hasDiscount as hasDiscountCalc,
} from "../lib/money";
import { slugify } from "../lib/slug";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

function getSessionIdSafe() {
  if (typeof window === "undefined") return "";
  const key = "mm_session_id";
  try {
    let id = window.localStorage.getItem(key);
    if (!id) {
      const hasUUID =
        typeof window.crypto !== "undefined" &&
        typeof window.crypto.randomUUID === "function";
      id = hasUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}

export default function ProductTile({
  product,
  title,
  subtitle,
  image,
  wished,
  onToggleWishlist,
  onAddToCart,
  onQuickView,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language || "en";

  const baseGross = resolveBaseGross(product);
  const priceNum = resolveProductPrice(product);
  const hasDiscount =
    typeof product?.is_discounted === "boolean"
      ? product.is_discounted
      : hasDiscountCalc(product);

  const percent =
    hasDiscount && baseGross > 0
      ? Math.round(((baseGross - priceNum) / baseGross) * 100)
      : 0;

  const stockVal = product?.stock ?? product?.quantity ?? 0;
  const stock = Number.isFinite(Number(stockVal)) ? Number(stockVal) : 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock < 2;
  const [trackEvent] = useTrackEventMutation();
  const track = (payload) => {
    try {
      trackEvent(payload);
    } catch {
      /* ignore */
    }
  };

  const priceEl = hasDiscount ? (
    <div className="flex items-center gap-2">
      <span className="font-semibold">{fmtEUR(priceNum, locale)}</span>
      <span className="text-xs line-through opacity-60">
        {fmtEUR(baseGross, locale)}
      </span>
      {percent > 0 && (
        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
          <Tag className="w-3 h-3" /> -{percent}%
        </span>
      )}
    </div>
  ) : (
    <div className="font-semibold">{fmtEUR(baseGross || priceNum, locale)}</div>
  );

  // 👉 Global click: go to product details
  const goToDetail = () => {
    const slug = slugify(title);
    navigate(`/products/${slug}-${product.id}`);
  };

  return (
    <article
      className="group cursor-pointer"
      onClick={goToDetail} // whole card navigates
    >
      {/* IMAGE AREA */}
      <div className="relative bg-marblewhite dark:bg-marbleblack">
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

          {/* wishlist */}
          <button
            type="button"
            aria-label={t("wishlist.buttonLabel")}
            onClick={(e) => {
              e.stopPropagation(); // don't navigate

              // 1) do the real wishlist action (backend wishlist API)
              onToggleWishlist?.(product.id);

              // 2) track event (analytics)
              const session_id = getSessionIdSafe();
              const url_path =
                typeof window !== "undefined" ? window.location.pathname : "";

              const event_type = wished ? "wishlist_remove" : "wishlist_add";

              track({
                event_type,
                product_id: product.id,
                session_id,
                url_path,
                extra: wished ? { action: "remove" } : {},
              });
            }}
            className={`absolute top-3 right-3 p-2 rounded-full shadow ${
              wished
                ? "bg-red-500 text-white"
                : "bg-white/90 dark:bg-gray-900/80 hover:bg-white"
            }`}
            title={
              wished
                ? t("wishlist.remove", "Remove from wishlist")
                : t("wishlist.add", "Add to wishlist")
            }
          >
            <Heart className="w-5 h-5" />
          </button>

          {/* badges */}
          {isOut && (
            <div className="absolute left-0 top-3 px-3 py-1 rounded-r-xl bg-gray-900/90 text-white text-xs font-semibold">
              {t("product.outOfStock", "Out of stock — arriving soon")}
              <div className="text-[11px] px-2 py-1 rounded bg-white/90 text-gray-800 inline-block">
                {t("product.notifyCta", "Tap to see details & get notified")}
              </div>
            </div>
          )}

          {!isOut && hasDiscount && (
            <div className="absolute left-0 top-3 px-3 py-1 rounded-r-xl bg-red-600 text-white text-xs font-semibold">
              -{percent}% {t("product.off", "OFF")}
            </div>
          )}

          {/* QUICK VIEW OVERLAY – separate button */}
          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // prevent navigation
                onQuickView(product);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="px-4 py-2 rounded-full bg-white/95 dark:bg-neutral-900/95 text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm">
                {t("product.quickView", "Quick View")}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* TEXT + PRICE */}
      <div className="pt-3">
        <h3
          className="font-medium text-sm md:text-base text-gray-900 dark:text-backnewsdark line-clamp-2"
          onClick={(e) => {
            e.stopPropagation(); // already handled by article, but to be safe
            goToDetail();
          }}
        >
          {title}
        </h3>

        {subtitle && (
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
            {subtitle}
          </p>
        )}

        <div className="mt-2">
          {isOut ? (
            <div className="text-xs font-semibold text-red-600">
              {t("product.arriveSoon", "We’ll restock soon — stay tuned!")}
            </div>
          ) : isLow ? (
            <div className="text-xs font-semibold text-amber-600">
              {t("product.lowStock", "Hurry — fewer than 2 left!")}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-col dark:text-backnewswhite">
            {priceEl}
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {t("product.inclVat", "incl. 19% VAT")}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation(); // don't navigate when adding to cart
              if (!isOut) onAddToCart?.(product, Number(priceNum || 0));
            }}
            disabled={isOut}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-backnewswhite text-white hover:opacity-90 transition disabled:opacity-50 dark:bg-backnewsdark dark:text-marbleblack"
            title={isOut ? t("product.cannotAdd", "Out of stock") : undefined}
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
