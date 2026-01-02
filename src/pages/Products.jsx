import ProductTile from "../components/ProductTile";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { homeCategories } from "../data/homeCategories";
import { useListProductsQuery } from "../features/products/productsApi";
import { addItem } from "../features/cart/cartSlice";
import { resolveProductPrice } from "../lib/money";
import { useSelector, useDispatch } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { productTitle } from "../lib/i18n";
import {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";
import QuickViewModal from "../components/QuickViewModal";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

const MATERIALS = [
  { value: "marble", label: "products.filters.material.marble" },
  { value: "granite", label: "products.filters.material.granite" },
  { value: "stone", label: "products.filters.material.stone" },
  { value: "onyx", label: "products.filters.material.onyx" },
  { value: "quartz", label: "products.filters.material.quartz" },
];
const COLORS = [
  { value: "white", label: "products.filters.color.white" },
  { value: "black", label: "products.filters.color.black" },
  { value: "grey", label: "products.filters.color.grey" },
  { value: "brown", label: "products.filters.color.brown" },
  { value: "green", label: "products.filters.color.green" },
];
const PAGE_SIZE = 8;
const BASE_PATH = "/decorative-products";

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const { pathname } = useLocation();
  const canonical = `https://mindmines.eu${pathname}`;
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [trackEvent] = useTrackEventMutation();

  const track = useCallback(
    (payload) => {
      try {
        // Fire and forget; we don't care about the response here
        trackEvent(payload);
      } catch {
        /* ignore tracking errors */
      }
    },
    [trackEvent]
  );
  const isLoggedIn = useSelector(selectIsAuthenticated);

  const [page, setPage] = useState(1);
  const [materials, setMaterials] = useState([]);
  const [colors, setColors] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });

  const { data, isFetching, isError } = useListProductsQuery({
    page,
    page_size: PAGE_SIZE,
    category: categoryId,
    material: materials.join(",") || undefined,
    color: colors.join(",") || undefined,
    min_price: priceRange.min,
    max_price: priceRange.max,
  });

  const products = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data || Array.isArray(data)) return 1;
    const count = typeof data.count === "number" ? data.count : products.length;
    return Math.max(1, Math.ceil(Number(count || 0) / PAGE_SIZE));
  }, [data, products]);

  // SEO helpers
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://mindmines.eu";
  const listUrl = categoryId
    ? `${currentOrigin}${BASE_PATH}/category/${categoryId}?page=${page}`
    : `${currentOrigin}${BASE_PATH}?page=${page}`;
  const canonUrl = listUrl;

  const categoryObj = homeCategories
    .filter((c) => String(c.link || "").startsWith(BASE_PATH))
    .find((c) => String(c.id) === String(categoryId));

  const pageTitle = categoryObj
    ? t("products.meta.categoryTitle", { category: t(categoryObj.label) })
    : t("products.meta.allTitle");
  const pageDesc = categoryObj
    ? t("products.meta.categoryDescription", { category: t(categoryObj.label) })
    : t("products.meta.defaultDescription");

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: currentOrigin },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: `${currentOrigin}${BASE_PATH}/`,
      },
      ...(categoryObj
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: t(categoryObj.label),
              item: `${currentOrigin}${BASE_PATH}/category/${categoryId}/`,
            },
          ]
        : []),
    ],
  };

  // wishlist
  const { data: wlRaw } = useGetWishlistQuery(undefined, { skip: !isLoggedIn });
  const wl = useMemo(() => {
    if (!wlRaw) return [];
    if (Array.isArray(wlRaw)) return wlRaw;
    if (Array.isArray(wlRaw.results)) return wlRaw.results;
    return [];
  }, [wlRaw]);
  const wlIds = useMemo(() => new Set(wl.map((w) => Number(w.product))), [wl]);
  const [addWish] = useAddToWishlistMutation();
  const [removeWish] = useRemoveFromWishlistMutation();
  const materialsKey = useMemo(() => materials.join(","), [materials]);
  const colorsKey = useMemo(() => colors.join(","), [colors]);

  // Track product list impressions when data/filters/page change
  useEffect(() => {
    if (!products || products.length === 0) return;

    track({
      event_type: "page_view",
      session_id: undefined,
      url_path: "/decorative-products",
      extra: {
        category: categoryId || null,
        page,
        materials,
        colors,
        price_min: priceRange.min,
        price_max: priceRange.max,
        count: products.length,
        _original_event_type: "product_list_view",
      },
    });
  }, [products, categoryId, page, materials, colors, priceRange, track]);

  useEffect(() => {
    setPage(1);
  }, [categoryId, materialsKey, colorsKey, priceRange]);

  const toggleWishlist = async (id) => {
    if (!isLoggedIn) return toast.warning(t("wishlist.loginRequired"));
    try {
      if (wlIds.has(id)) {
        await removeWish(id).unwrap();
        toast.info(t("wishlist.removedToast"));

        // 👇 track remove
        track({
          event_type: "wishlist_remove",
          product_id: id,
        });
      } else {
        await addWish(id).unwrap();
        toast.success(t("wishlist.addedToast"));

        // 👇 track add
        track({
          event_type: "wishlist_add",
          product_id: id,
        });
      }
    } catch {
      toast.error(t("wishlist.actionFailed"));
    }
  };

  const dispatch = useDispatch();
  const onAddToCart = (p, priceFromTile) => {
    const unitPrice = Number.isFinite(priceFromTile)
      ? priceFromTile
      : resolveProductPrice(p);

    const stockNum = Number(p?.stock ?? p?.quantity ?? 0);

    // 👇 track add_to_cart
    track({
      event_type: "add_to_cart",
      product_id: p.id,
      value: unitPrice,
      quantity: 1,
    });

    dispatch(
      addItem({
        id: p.id,
        name: productTitle(p, lang), // ✅ cart expects 'name'
        priceRange: unitPrice,
        image: p.image,
        stock: Number.isFinite(stockNum) ? stockNum : 0,
      })
    );
    navigate("/cart");
  };

  const handleQuickView = (p) => {
    setQuickViewProduct(p);
    track({
      event_type: "product_quick_view",
      product_id: p.id,
    });
  };

  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack">
      {/* Quick View modal */}
      <QuickViewModal
        open={!!quickViewProduct}
        product={quickViewProduct}
        lang={lang}
        wished={quickViewProduct ? wlIds.has(quickViewProduct.id) : false}
        onToggleWishlist={toggleWishlist}
        onAddToCart={(prod, priceNum) => onAddToCart(prod, priceNum)}
        onClose={() => setQuickViewProduct(null)}
      />
      <div className="container max-w-7xl mx-auto px-4 py-8 flex gap-6">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDesc} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDesc} />
          <meta property="og:url" content={canonical} />
          <meta
            property="og:image"
            content="https://mindmines.eu/static/media/BlackLogo.5bca70d1f51039db05b5.webp"
          />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={pageDesc} />
          <meta
            name="twitter:image"
            content="https://mindmines.eu/static/media/BlackLogo.5bca70d1f51039db05b5.webp"
          />
          <link rel="canonical" href={canonical} />
          {page > 1 && (
            <link
              rel="prev"
              href={
                categoryId
                  ? `${currentOrigin}${BASE_PATH}/category/${categoryId}?page=${
                      page - 1
                    }`
                  : `${currentOrigin}${BASE_PATH}?page=${page - 1}`
              }
            />
          )}
          {page < totalPages && (
            <link
              rel="next"
              href={
                categoryId
                  ? `${currentOrigin}${BASE_PATH}/category/${categoryId}?page=${
                      page + 1
                    }`
                  : `${currentOrigin}${BASE_PATH}?page=${page + 1}`
              }
            />
          )}
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbJsonLd)}
          </script>
        </Helmet>

        {/* Filters (desktop only) */}
        <aside className="w-64 hidden md:block">
          <div className="mb-6 p-4 rounded-xl shadow-sm ring-1 ring-black/5 dark:text-white dark:ring-white/5 bg-white dark:bg-neutral-900">
            <h4 className="font-semibold mb-2">
              {t("products.filters.material.title")}
            </h4>
            {MATERIALS.map((m) => (
              <label key={m.value} className="block mb-1 text-sm">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-gray-300 dark:border-neutral-700 text-backnewswhite focus:ring-backnewswhite/80"
                  checked={materials.includes(m.value)}
                  onChange={() =>
                    setMaterials((prev) =>
                      prev.includes(m.value)
                        ? prev.filter((v) => v !== m.value)
                        : [...prev, m.value]
                    )
                  }
                />
                {t(m.label)}
              </label>
            ))}
          </div>

          <div className="mb-6 p-4 rounded-xl shadow-sm ring-1 ring-black/5  dark:text-white dark:ring-white/5 bg-white dark:bg-neutral-900">
            <h4 className="font-semibold mb-2">
              {t("products.filters.color.title")}
            </h4>
            {COLORS.map((c) => (
              <label key={c.value} className="block mb-1 text-sm">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-gray-300 dark:border-neutral-700 text-backnewswhite focus:ring-backnewswhite/80"
                  checked={colors.includes(c.value)}
                  onChange={() =>
                    setColors((prev) =>
                      prev.includes(c.value)
                        ? prev.filter((v) => v !== c.value)
                        : [...prev, c.value]
                    )
                  }
                />
                {t(c.label)}
              </label>
            ))}
          </div>

          <div className="p-4 rounded-xl shadow-sm ring-1 ring-black/5  dark:text-white dark:ring-white/5 bg-white dark:bg-neutral-900">
            <h4 className="font-semibold mb-2">
              {t("products.filters.price")}
            </h4>

            {/* Price Options */}
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              {[
                { label: "0 - 50", min: 0, max: 50 },
                { label: "50 - 100", min: 50, max: 100 },
                { label: "100 - 200", min: 100, max: 200 },
                { label: "200 - 500", min: 200, max: 500 },
                { label: "500 - 750", min: 500, max: 750 },
                { label: "750 - 1000", min: 750, max: 1000 },
              ].map((r) => (
                <label
                  key={r.label}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="price_filter"
                    checked={
                      priceRange.min === r.min && priceRange.max === r.max
                    }
                    onChange={() => setPriceRange({ min: r.min, max: r.max })}
                    className="accent-backnewswhite"
                  />
                  <span>{r.label} €</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <main className="flex-1">
          {/* category chips */}
          <div className="flex gap-3 justify-center mb-8 flex-wrap">
            {homeCategories
              .filter((cat) => String(cat.link || "").startsWith(BASE_PATH))
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`${BASE_PATH}/category/${cat.id}`)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-full border shadow-sm transition
                              hover:scale-105 focus:outline-none focus:ring-2 focus:ring-backnewswhite/70
                              ${
                                String(categoryId) === String(cat.id)
                                  ? "bg-backnewswhite text-white border-backnewswhite"
                                  : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-neutral-700"
                              }`}
                >
                  <img
                    src={cat.image}
                    alt={t(cat.label)}
                    className="w-8 h-8 rounded-full"
                    fetchPriority="high"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="text-sm font-medium">{t(cat.label)}</span>
                </button>
              ))}

            <button
              onClick={() => navigate(BASE_PATH)}
              className={`px-4 py-2 rounded-full border shadow-sm transition hover:scale-105
                          focus:outline-none focus:ring-2 focus:ring-backnewswhite/70
                          ${
                            !categoryId
                              ? "bg-backnewswhite text-white border-backnewswhite"
                              : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-neutral-700"
                          }`}
            >
              {t("All")}
            </button>
          </div>

          {isFetching ? (
            <div className="text-center text-gray-500 dark:text-gray-300">
              {t("common.loading")}
            </div>
          ) : isError ? (
            <div className="text-center text-red-500">
              {t("products.error")}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-400">
              {t("products.noResults")}
            </div>
          ) : (
            <div className="grid grid-cols-2  md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductTile
                  key={p.id}
                  product={p}
                  title={productTitle(p, lang)}
                  subtitle={p[`short_description1_${lang}`]}
                  image={p.image}
                  wished={wlIds.has(p.id)}
                  onToggleWishlist={toggleWishlist}
                  onAddToCart={(prod, priceNum) => onAddToCart(prod, priceNum)}
                  onQuickView={() => handleQuickView(p)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setPage(idx + 1)}
                  className={`px-3 py-1.5 rounded-lg border transition
                              focus:outline-none focus:ring-2 focus:ring-backnewswhite/70
                              ${
                                page === idx + 1
                                  ? "bg-backnewswhite text-white border-backnewswhite"
                                  : "bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-neutral-700"
                              }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
