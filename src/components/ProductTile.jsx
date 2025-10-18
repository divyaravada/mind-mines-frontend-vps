//src/components/ProductTile.jsx
import React from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function displayPrice(p) {
  // Prefer backend-computed vat_price; else price; else variant min price
  if (typeof p.vat_price === "number") return p.vat_price;
  if (typeof p.price === "number") return p.price;
  if (Array.isArray(p.variants) && p.variants.length) {
    const min = Math.min(...p.variants.map((v) => v.price || 0));
    return Number.isFinite(min) ? min : 0;
  }
  return 0;
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const price = displayPrice(product);

  return (
    <article
      className="group rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow hover:shadow-md transition overflow-hidden cursor-pointer"
      onClick={() => navigate(`/decorative-products/${product.id}`)}
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
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
            {subtitle}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="font-semibold">€ {price.toFixed(2)}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.(product, price);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-marbleblack text-white hover:bg-black transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t("home.topsellers.addToCart", "Add to cart")}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
