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
import { resolveProductPrice } from "../lib/money";

export default function TopSellers() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsAuthenticated);

  const { data: topData, isLoading } = useGetTopProductsQuery();
  const top = Array.isArray(topData) ? topData : topData?.results ?? [];

  const { data: wlRaw } = useGetWishlistQuery(undefined, { skip: !isLoggedIn });
  const wl = useMemo(() => {
    if (Array.isArray(wlRaw)) return wlRaw;
    if (Array.isArray(wlRaw?.results)) return wlRaw.results;
    return [];
  }, [wlRaw]);
  const wlIds = useMemo(() => new Set(wl.map((w) => Number(w.product))), [wl]);

  const [addWish] = useAddToWishlistMutation();
  const [removeWish] = useRemoveFromWishlistMutation();

  const toggleWishlist = async (id) => {
    if (!isLoggedIn) return toast.warning(t("home.topsellers.loginRequired"));
    try {
      if (wlIds.has(id)) {
        await removeWish(id).unwrap();
        toast.info(t("home.topsellers.removedWishlist"));
      } else {
        await addWish(id).unwrap();
        toast.success(t("home.topsellers.addedWishlist"));
      }
    } catch {
      toast.error(t("home.topsellers.actionFailed"));
    }
  };

  const onAddToCart = (p) => {
    const price = resolveProductPrice(p);
    dispatch(
      addItem({
        id: p.id,
        name: productTitle(p, lang), // ✅ cart expects 'name'
        price,
        image: p.image || p.image_url,
      })
    );
    navigate("/cart");
  };

  return (
    <section className="py-12 bg-marblewhite dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("home.topsellers.title")}
          </h2>
          <Link
            to="/decorative-products"
            className="text-sm font-medium text-backnewswhite hover:opacity-90"
          >
            {t("home.topsellers.seeAll")}
          </Link>
        </div>

        {isLoading ? (
          <div className="text-gray-600 dark:text-gray-300">
            {t("common.loading")}
          </div>
        ) : top.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">
            {t("home.topsellers.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
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
