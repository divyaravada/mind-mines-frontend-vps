// src/components/QuickViewModal.jsx
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fmtEUR,
  resolveBaseGross,
  resolveProductPrice,
  hasDiscount as hasDiscountCalc,
} from "../lib/money";
import { productTitle } from "../lib/i18n";
import { useNavigate } from "react-router-dom";

export default function QuickViewModal({
  open,
  product,
  lang = "en",
  wished,
  onToggleWishlist,
  onAddToCart,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();

  if (!open || !product) return null;

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

  const gallery = [
    product.image,
    ...(Array.isArray(product.media)
      ? product.media.map((m) => m.image || m.url).filter(Boolean)
      : []),
  ].filter(Boolean);

  const title = productTitle(product, lang);
  const subtitle = product[`short_description1_${lang}`];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm px-0 md:px-3"
      onClick={onClose}
    >
      <div
        className="
          relative w-full md:max-w-5xl
          bg-white dark:bg-neutral-900
          rounded-t-2xl md:rounded-2xl
          shadow-xl overflow-hidden
          max-h-[90vh] md:max-h-[80vh]
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          className="absolute right-3 top-3 md:right-4 md:top-4 p-2 rounded-full bg-white/80 dark:bg-neutral-800 hover:bg-white shadow text-gray-700 dark:text-gray-200"
          aria-label={t("product.closeQuickView", "Close")}
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
          {/* LEFT: IMAGE (top on mobile) */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 md:p-6 flex items-center justify-center">
            {gallery.length > 0 ? (
              <img
                src={gallery[0]}
                alt={title}
                className="
                  w-full
                  max-h-[260px] sm:max-h-[320px] md:max-h-[70vh]
                  object-contain rounded-lg
                "
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            )}
          </div>

          {/* RIGHT: DETAILS (below on mobile) */}
          <div className="p-4 md:p-8 flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Price block */}
            <div className="flex items-center gap-3 mt-1">
              {hasDiscount ? (
                <>
                  <span className="text-lg md:text-xl font-semibold">
                    {fmtEUR(priceNum, locale)}
                  </span>
                  <span className="text-sm line-through opacity-60">
                    {fmtEUR(baseGross, locale)}
                  </span>
                  {percent > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                      -{percent}% {t("product.off", "OFF")}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-lg md:text-xl font-semibold">
                  {fmtEUR(baseGross || priceNum, locale)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("product.inclVat", "incl. 19% VAT")}
            </div>

            {/* CTA buttons */}
            <div className="mt-4 md:mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="w-full py-3 rounded-lg bg-backnewswhite text-white font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60"
                onClick={() => {
                  if (onAddToCart) onAddToCart(product, priceNum);
                }}
              >
                {t("product.addToCart", "Add to cart")}
              </button>

              {onToggleWishlist && (
                <button
                  type="button"
                  className="w-full py-2.5 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                  onClick={() => onToggleWishlist(product.id)}
                >
                  {wished
                    ? t("wishlist.remove", "Remove from wishlist")
                    : t("wishlist.add", "Add to wishlist")}
                </button>
              )}

              <button
                type="button"
                className="text-sm text-backnewswhite dark:text-backnewsdark underline self-start mt-1"
                onClick={() => {
                  navigate(`/products/${product.id}`);
                  onClose();
                }}
              >
                {t("product.viewDetails", "View more details")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
