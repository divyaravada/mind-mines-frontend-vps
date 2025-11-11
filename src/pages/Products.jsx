import ProductTile from "../components/ProductTile";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { homeCategories } from "../data/homeCategories";
import { useListProductsQuery } from "../features/products/productsApi";
import { addItem } from "../features/cart/cartSlice";
import { fmtEUR, resolveProductPrice } from "../lib/money";
import { useSelector, useDispatch } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { productTitle } from "../lib/i18n";
import {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";

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
const PAGE_SIZE = 4;
const BASE_PATH = "/decorative-products";

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const isLoggedIn = useSelector(selectIsAuthenticated);

  const [page, setPage] = useState(1);
  const [materials, setMaterials] = useState([]);
  const [colors, setColors] = useState([]);
  const [price, setPrice] = useState(1000);

  const { data, isFetching, isError } = useListProductsQuery({
    page,
    page_size: PAGE_SIZE,
    category: categoryId,
    material: materials.join(",") || undefined,
    color: colors.join(",") || undefined,
    min_price: 0,
    max_price: price,
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

  useEffect(() => {
    setPage(1);
  }, [categoryId, materialsKey, colorsKey, price]);

  const toggleWishlist = async (id) => {
    if (!isLoggedIn) return toast.warning(t("wishlist.loginRequired"));
    try {
      if (wlIds.has(id)) {
        await removeWish(id).unwrap();
        toast.info(t("wishlist.removedToast"));
      } else {
        await addWish(id).unwrap();
        toast.success(t("wishlist.addedToast"));
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
    dispatch(
      addItem({
        id: p.id,
        name: productTitle(p, lang), // ✅ cart expects 'name'
        price: unitPrice,
        image: p.image,
      })
    );
    navigate("/cart");
  };

  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack">
      <div className="container max-w-7xl mx-auto px-4 py-8 flex gap-6">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDesc} />
          <link rel="canonical" href={canonUrl} />
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
          <div className="mb-6 p-4 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-neutral-900">
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

          <div className="mb-6 p-4 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-neutral-900">
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

          <div className="p-4 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-neutral-900">
            <h4 className="font-semibold mb-2">
              {t("products.filters.price")}
            </h4>
            <input
              type="range"
              min={0}
              max={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-backnewswhite"
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-1">
              <span>{t("products.filters.priceMin")}</span>
              <span>{fmtEUR(price, locale)}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
