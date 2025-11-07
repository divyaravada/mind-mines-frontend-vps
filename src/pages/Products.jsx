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
  { value: "marble", labelKey: "products.filters.material.marble" },
  { value: "granite", labelKey: "products.filters.material.granite" },
  { value: "stone", labelKey: "products.filters.material.stone" },
  { value: "onyx", labelKey: "products.filters.material.onyx" },
  { value: "quartz", labelKey: "products.filters.material.quartz" },
];
const COLORS = [
  { value: "white", labelKey: "products.filters.color.white" },
  { value: "black", labelKey: "products.filters.color.black" },
  { value: "grey", labelKey: "products.filters.color.grey" },
  { value: "brown", labelKey: "products.filters.color.brown" },
  { value: "green", labelKey: "products.filters.color.green" },
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

  const categoryObj = homeCategories.find(
    (c) => String(c.id) === String(categoryId)
  );
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

  useEffect(
    () => setPage(1),
    [categoryId, materials.join(","), colors.join(","), price]
  );

  const toggleWishlist = async (id) => {
    if (!isLoggedIn)
      return toast.warning(t("wishlist.loginRequired"));
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
    <div className="max-w-7xl mx-auto px-4 py-10 flex gap-6">
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

      {/* Filters */}
      <aside className="w-64 hidden md:block">
        <div className="mb-6 p-4 rounded shadow bg-white">
          <h4 className="font-semibold mb-2">{t("products.filters.material.title")}</h4>
          {MATERIALS.map((m) => (
            <label key={m.value} className="block mb-1">
              <input
                type="checkbox"
                className="mr-2"
                checked={materials.includes(m.value)}
                onChange={() =>
                  setMaterials((prev) =>
                    prev.includes(m.value)
                      ? prev.filter((v) => v !== m.value)
                      : [...prev, m.value]
                  )
                }
              />
              {t(m.labelKey)}
            </label>
          ))}
        </div>

        <div className="mb-6 p-4 rounded shadow bg-white">
          <h4 className="font-semibold mb-2">{t("products.filters.color.title")}</h4>
          {COLORS.map((c) => (
            <label key={c.value} className="block mb-1">
              <input
                type="checkbox"
                className="mr-2"
                checked={colors.includes(c.value)}
                onChange={() =>
                  setColors((prev) =>
                    prev.includes(c.value)
                      ? prev.filter((v) => v !== c.value)
                      : [...prev, c.value]
                  )
                }
              />
              {t(c.labelKey)}
            </label>
          ))}
        </div>

        <div className="p-4 rounded shadow bg-white">
          <h4 className="font-semibold mb-2">{t("products.filters.price")}</h4>
          <input
            type="range"
            min={0}
            max={1000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs">
            <span>{t("products.filters.priceMin")}</span>
            <span>{fmtEUR(price, locale)}</span>
          </div>
        </div>
      </aside>

      {/* Grid */}
      <main className="flex-1">
        <div className="flex gap-4 justify-center mb-10 flex-wrap">
          {homeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`${BASE_PATH}/category/${cat.id}`)}
              className={`flex flex-col items-center px-4 py-2 rounded border shadow-sm transition-all hover:scale-105 ${
                String(categoryId) === String(cat.id)
                  ? "bg-black text-white"
                  : "bg-white"
              }`}
            >
              <img
                src={cat.image}
                alt={cat.label}
                className="w-14 h-14 rounded-full shadow"
              />
              <span className="text-xs mt-1 font-medium">{t(cat.label)}</span>
            </button>
          ))}
          <button
            onClick={() => navigate(BASE_PATH)}
            className={`flex flex-col items-center px-4 py-2 rounded border shadow-sm transition-all hover:scale-105 ${
              !categoryId ? "bg-black text-white" : "bg-white"
            }`}
          >
            <span className="text-sm font-bold">{t("All")}</span>
          </button>
        </div>

        {isFetching ? (
          <div className="text-center text-gray-500">{t("common.loading")}</div>
        ) : isError ? (
          <div className="text-center text-red-500">
            {t("products.error")}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-400">
            {t("products.noResults")}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                className={`px-3 py-1 border rounded ${
                  page === idx + 1 ? "bg-black text-white" : "bg-white"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
