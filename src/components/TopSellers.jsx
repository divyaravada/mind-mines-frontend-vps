// src/components/TopSellers.jsx
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import ProductTile from "./ProductTile";
import { useGetTopProductsQuery } from "../features/products/productsApi";
import {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { addItem } from "../features/cart/cartSlice";
import { productTitle } from "../lib/i18n";
import { useNavigate } from "react-router-dom";

export default function TopSellers() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsAuthenticated);

  const { data: topData, isLoading } = useGetTopProductsQuery();
  const top = Array.isArray(topData) ? topData : topData?.results ?? [];

  // wishlist state
  const { data: wlRaw } = useGetWishlistQuery(undefined, { skip: !isLoggedIn });
  const wl = Array.isArray(wlRaw) ? wlRaw : wlRaw?.results ?? [];
  const wlIds = useMemo(() => new Set(wl.map((w) => Number(w.product))), [wl]);

  const [addWish] = useAddToWishlistMutation();
  const [removeWish] = useRemoveFromWishlistMutation();

  const toggleWishlist = async (id) => {
    if (!isLoggedIn)
      return toast.warning(t("Please log in to use the wishlist"));
    try {
      if (wlIds.has(id)) {
        await removeWish(id).unwrap();
        toast.info(t("Removed from wishlist"));
      } else {
        await addWish(id).unwrap();
        toast.success(t("Added to wishlist"));
      }
    } catch {
      toast.error(t("Action failed"));
    }
  };

  const onAddToCart = (p, price) => {
    dispatch(
      addItem({ id: p.id, title: productTitle(p, lang), price, image: p.image })
    );
    navigate("/cart");
  };

  return (
    <section className="py-12 bg-white dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            {t("home.topsellers.title")}
          </h2>
          <a href="/products" className="text-sm underline underline-offset-4">
            {t("home.topsellers.seeAll")}
          </a>
        </div>
        {isLoading ? (
          <div className="text-gray-500">{t("Loading...", "Loading...")}</div>
        ) : top.length === 0 ? (
          <div className="text-gray-400">
            {t("No products found.", "No products found.")}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {top.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                title={productTitle(p, lang)}
                subtitle={p[`short_description1_${lang}`]}
                image={p.image || p.image_url}
                wished={wlIds.has(p.id)}
                onToggleWishlist={toggleWishlist}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
