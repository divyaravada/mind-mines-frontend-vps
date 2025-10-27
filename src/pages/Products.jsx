// src/pages/Products.jsx
import ProductTile from "../components/ProductTile";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { homeCategories } from "../data/homeCategories";
import { useListProductsQuery } from "../features/products/productsApi";
import { addItem } from "../features/cart/cartSlice";
import { fmtEUR, toNumberEUR } from "../lib/money";
import { useSelector, useDispatch } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { productTitle } from "../lib/i18n";
import {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";

const MATERIALS = [
  { value: "marble", label: "Marble" },
  { value: "granite", label: "Granite" },
  { value: "stone", label: "Stone" },
  { value: "onyx", label: "Onyx" },
  { value: "quartz", label: "Quartz" },
];
const COLORS = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "grey", label: "Grey" },
  { value: "brown", label: "Brown" },
  { value: "green", label: "Green" },
];
const PAGE_SIZE = 4;

function getProductPrice(p) {
  // Try common keys in order of preference
  const raw =
    p?.vat_price ??
    p?.price_vat ??
    p?.final_price ??
    p?.gross_price ??
    p?.price ??
    0;
  return toNumberEUR(raw);
}

export default function ProductsPage() {
  const locale = i18n.language || "en";
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("de") ? "de" : "en";
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
  console.log(data);

  const totalPages = useMemo(() => {
    if (!data || Array.isArray(data)) return 1;
    const count =
      typeof data.count === "number"
        ? data.count
        : (Array.isArray(data.results) && data.results.length) ||
          (Array.isArray(data.items) && data.items.length) ||
          products.length;
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [data, products.length]);

  // ---- SEO helpers (safe defaults) ----
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://mindmines.eu";
  const basePath = "/decorative-products";
  const listUrl = categoryId
    ? `${currentOrigin}${basePath}/category/${categoryId}?page=${page}`
    : `${currentOrigin}${basePath}?page=${page}`;
  const canonUrl = listUrl; // keep params so page 2/3 are distinct

  const categoryObj = homeCategories.find(
    (c) => String(c.id) === String(categoryId)
  );
  const pageTitle = categoryObj
    ? `${t(categoryObj.label)} | MindMines`
    : `${t("All")} | MindMines`;
  const pageDesc = categoryObj
    ? t("Browse {{cat}} at MindMines", { cat: t(categoryObj.label) })
    : t("Browse products at MindMines");

  // Breadcrumb JSON-LD (works with or without category)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: currentOrigin },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: `${currentOrigin}${basePath}/`,
      },
      ...(categoryObj
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: t(categoryObj.label),
              item: `${currentOrigin}${basePath}/category/${categoryId}/`,
            },
          ]
        : []),
    ],
  };

  const { data: wlRaw } = useGetWishlistQuery(undefined, { skip: !isLoggedIn });
  const wl = Array.isArray(wlRaw) ? wlRaw : wlRaw?.results ?? [];
  const wlIds = useMemo(() => new Set(wl.map((w) => Number(w.product))), [wl]);
  const [addWish] = useAddToWishlistMutation();
  const [removeWish] = useRemoveFromWishlistMutation();

  useEffect(
    () => setPage(1),
    [categoryId, materials.join(","), colors.join(","), price]
  );

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
  const dispatch = useDispatch();
  const onAddToCart = (p, priceFromTile) => {
    // Ensure we put a NUMBER in the cart
    const unitPrice = Number.isFinite(priceFromTile)
      ? priceFromTile
      : getProductPrice(p);

    dispatch(
      addItem({
        id: p.id,
        title: productTitle(p, lang),
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
                ? `${currentOrigin}${basePath}/category/${categoryId}?page=${
                    page - 1
                  }`
                : `${currentOrigin}${basePath}?page=${page - 1}`
            }
          />
        )}
        {page < totalPages && (
          <link
            rel="next"
            href={
              categoryId
                ? `${currentOrigin}${basePath}/category/${categoryId}?page=${
                    page + 1
                  }`
                : `${currentOrigin}${basePath}?page=${page + 1}`
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
          <h4 className="font-semibold mb-2">{t("Material")}</h4>
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
              {m.label}
            </label>
          ))}
        </div>

        <div className="mb-6 p-4 rounded shadow bg-white">
          <h4 className="font-semibold mb-2">{t("Color")}</h4>
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
              {c.label}
            </label>
          ))}
        </div>

        <div className="p-4 rounded shadow bg-white">
          <h4 className="font-semibold mb-2">{t("Price")}</h4>
          <input
            type="range"
            min={0}
            max={1000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs">
            <span>0 €</span>
            <span>{fmtEUR(price, locale)} €</span>
          </div>
        </div>
      </aside>

      {/* Grid */}
      <main className="flex-1">
        <div className="flex gap-4 justify-center mb-10 flex-wrap">
          {homeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/products/category/${cat.id}`)}
              className={`flex flex-col items-center px-4 py-2 rounded border shadow-sm transition-all hover:scale-105 ${
                categoryId === cat.id ? "bg-black text-white" : "bg-white"
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
            onClick={() => navigate("/decorative-products")}
            className={`flex flex-col items-center px-4 py-2 rounded border shadow-sm transition-all hover:scale-105 ${
              !categoryId ? "bg-black text-white" : "bg-white"
            }`}
          >
            <span className="text-sm font-bold">{t("All")}</span>
          </button>
        </div>

        {isFetching ? (
          <div className="text-center text-gray-500">{t("Loading...")}</div>
        ) : isError ? (
          <div className="text-center text-red-500">
            {t("Error loading products")}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-400">
            {t("No products found.")}
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
