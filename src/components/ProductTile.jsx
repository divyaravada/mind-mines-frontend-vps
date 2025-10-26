//src/components/ProductTile.jsx

import { Heart, ShoppingCart, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { fmtEUR, toNumberEUR } from "../lib/money";

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function displayPrices(p) {
  // Ensure numeric inputs even if API sends strings
  const vat = p?.vat_price;
  const price = p?.price;

  const gross = Number.isFinite(vat)
    ? vat
    : vat != null
    ? toNum(vat)
    : price != null
    ? toNum(price) * 1.19
    : 0;

  const final = p?.final_price != null ? toNum(p.final_price, gross) : gross;
  const discounted = !!p?.is_discounted && final < gross;
  const percent =
    discounted && gross > 0 ? Math.round(((gross - final) / gross) * 100) : 0;
  return { gross, final, discounted, percent };
}

export default function ProductTile({
  product,
  title,
  subtitle,
  image,
  wished,
  onToggleWishlist,
  onAddToCart,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language || "en";
  const priceNum = toNumberEUR(fmtEUR(priceNum, locale) ?? product?.price);

  const { gross, final, discounted, percent } = displayPrices(product);
  const base = gross;
  const hasDiscount = discounted;

  const stockVal = product?.stock ?? product?.quantity ?? 0;
  const stock = toNum(stockVal, 0);
  const isOut = stock <= 0;
  const isLow = !isOut && stock < 5;

  const priceEl = hasDiscount ? (
    <div className="flex items-center gap-2">
      <span className="font-semibold">€ {final.toFixed(2)}</span>
      <span className="text-xs line-through opacity-60">
        € {base.toFixed(2)}
      </span>
      {percent > 0 && (
        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
          <Tag className="w-3 h-3" /> -{percent}%
        </span>
      )}
    </div>
  ) : (
    <div className="font-semibold">€ {base.toFixed(2)}</div>
  );

  return (
    <article
      className="group rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow hover:shadow-md transition overflow-hidden cursor-pointer"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        <img
          src={image}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
          loading="lazy"
        />
        <button
          type="button"
          aria-label="Wishlist"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full shadow ${
            wished
              ? "bg-red-500 text-white"
              : "bg-white/90 dark:bg-gray-900/80 hover:bg-white"
          }`}
        >
          <Heart className="w-5 h-5" />
        </button>
        {/* Out of stock ribbon */}
        {isOut && (
          <div className="absolute left-0 top-3 px-3 py-1 rounded-r-xl bg-gray-900/90 text-white text-xs font-semibold">
            {t("product.outOfStock", "Out of stock — arriving soon")}
            <div className="text-[11px] px-2 py-1 rounded bg-white/90 text-gray-800 inline-block">
              {t("product.notifyCta", "Tap to see details & get notified")}
            </div>
          </div>
        )}

        {/* Discount ribbon (only when discounted) */}
        {!isOut && hasDiscount && (
          <div className="absolute left-0 top-3 px-3 py-1 rounded-r-xl bg-red-600 text-white text-xs font-semibold">
            -{percent}% {t("product.off", "OFF")}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
            {subtitle}
          </p>
        )}

        {/* Stock messaging */}
        <div className="mt-2">
          {isOut ? (
            <div className="text-xs font-semibold text-red-600">
              {t("product.arriveSoon", "We’ll restock soon — stay tuned!")}
            </div>
          ) : isLow ? (
            <div className="text-xs font-semibold text-amber-600">
              {t("product.lowStock", "Hurry — fewer than 5 left!")}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between mt-3">
          {priceEl}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isOut) onAddToCart?.(product, priceNum);
            }}
            disabled={isOut}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-marbleblack text-white hover:bg-black transition disabled:opacity-50"
            title={isOut ? t("product.cannotAdd", "Out of stock") : undefined}
          >
            <ShoppingCart className="w-4 h-4" />
            {/* <span>
              {isOut
                ? t("product.out", "Out")
                : t("home.topsellers.addToCart", "Add to cart")}
            </span> */}
          </button>
        </div>
      </div>
    </article>
  );
}
