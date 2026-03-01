import ProductTile from "../components/ProductTile";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { homeCategories } from "../data/homeCategories";
import { useListProductsQuery } from "../features/products/productsApi";
import { addItem } from "../features/cart/cartSlice";
import { resolveProductPrice } from "../lib/money";
import { useSelector, useDispatch } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { productTitle } from "../lib/i18n";
import SEO from "../components/SEO";
import {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";
import QuickViewModal from "../components/QuickViewModal";
import { useTrackEventMutation } from "../features/marketing/marketingApi";
import { isPrerender } from "../utils/isPrerender";

const MATERIALS = [
  { value: "granite", label: "products.filters.material.granite" },
  { value: "marble", label: "products.filters.material.marble" },
  { value: "onyx", label: "products.filters.material.onyx" },
  { value: "marquina", label: "products.filters.material.marquina" },
  { value: "travertine", label: "products.filters.material.travertine" },
  { value: "quartz", label: "products.filters.material.quartz" },
];

const COLORS = [
  { value: "beige", label: "products.filters.color.beige" },
  { value: "beige_gold", label: "products.filters.color.beigeGold" },
  { value: "black", label: "products.filters.color.black" },
  { value: "black_white", label: "products.filters.color.blackAndWhite" },
  { value: "blue", label: "products.filters.color.blue" },
  { value: "brown", label: "products.filters.color.brown" },
  { value: "burgundy", label: "products.filters.color.burgundy" },
  { value: "cream", label: "products.filters.color.cream" },
  { value: "gold", label: "products.filters.color.gold" },
  { value: "gray", label: "products.filters.color.gray" },
  { value: "green", label: "products.filters.color.green" },
  { value: "green_gold", label: "products.filters.color.greenGold" },
  { value: "light_green", label: "products.filters.color.lightGreen" },
  { value: "orange", label: "products.filters.color.orange" },
  { value: "pink", label: "products.filters.color.pink" },
  { value: "red", label: "products.filters.color.red" },
  { value: "yellow", label: "products.filters.color.yellow" },
  { value: "silver", label: "products.filters.color.silver" },
];

const PRICE_BUCKETS = [
  { label: "0 - 50", min: 0, max: 50 },
  { label: "50 - 100", min: 50, max: 100 },
  { label: "100 - 200", min: 100, max: 200 },
  { label: "200 - 500", min: 200, max: 500 },
  { label: "500 - 750", min: 500, max: 750 },
  { label: "750 - 1000", min: 750, max: 1000 },
  { label: "1000 - 2000", min: 1000, max: 2000 },
  { label: "2000 - 5000", min: 2000, max: 5000 },
];

// Fetch “all” products in one request (backend must allow it)
const PAGE_SIZE = 1000;

const BASE_PATH = "/decorative-products";
const DEFAULT_PRICE = { min: 0, max: 5000 };

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const titleOrderingField = lang === "de" ? "title_de" : "title_en";

  // ✅ Sort options (price sort will be done CLIENT-SIDE to guarantee it works)
  const SORT_OPTIONS = useMemo(
    () => [
      { value: "", labelKey: "products.sort.featured", fallback: "Featured" },
      {
        value: titleOrderingField,
        labelKey: "products.sort.nameAZ",
        fallback: "Alphabetically, A-Z",
      },
      {
        value: `-${titleOrderingField}`,
        labelKey: "products.sort.nameZA",
        fallback: "Alphabetically, Z-A",
      },
      {
        value: "price",
        labelKey: "products.sort.priceLowHigh",
        fallback: "Price, Low To High",
      },
      {
        value: "-price",
        labelKey: "products.sort.priceHighLow",
        fallback: "Price, High To Low",
      },
    ],
    [titleOrderingField],
  );

  const { pathname } = useLocation();
  const canonical = `https://mindmines.eu${pathname}`;
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [trackEvent] = useTrackEventMutation();

  const track = useCallback(
    (payload) => {
      try {
        trackEvent(payload);
      } catch {
        /* ignore tracking errors */
      }
    },
    [trackEvent],
  );

  const isLoggedIn = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();

  const [page, setPage] = useState(1);
  const shuffleSeedRef = useRef(Date.now());

  // ✅ Draft (UI) vs Applied (API)
  const [draftMaterials, setDraftMaterials] = useState([]);
  const [draftColors, setDraftColors] = useState([]);
  const [draftPriceRange, setDraftPriceRange] = useState(DEFAULT_PRICE);

  const [appliedMaterials, setAppliedMaterials] = useState([]);
  const [appliedColors, setAppliedColors] = useState([]);
  const [appliedPriceRange, setAppliedPriceRange] = useState(DEFAULT_PRICE);

  // Top-bar UI
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [appliedSort, setAppliedSort] = useState("");

  function seededRandom(seed) {
    // deterministic pseudo-random generator
    let t = seed + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function stableShuffle(arr, seed = 1) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const r = seededRandom(seed + i);
      const j = Math.floor(r * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const appliedMaterialsKey = useMemo(
    () => appliedMaterials.join(","),
    [appliedMaterials],
  );
  const appliedColorsKey = useMemo(
    () => appliedColors.join(","),
    [appliedColors],
  );

  // ✅ IMPORTANT:
  // price sorting is done CLIENT-SIDE because many APIs don’t expose ordering=price
  const serverOrdering = useMemo(() => {
    if (!appliedSort) return undefined;
    if (appliedSort === "price" || appliedSort === "-price") return undefined;
    return appliedSort;
  }, [appliedSort]);

  const queryArgs = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      pageSize: PAGE_SIZE,
      limit: PAGE_SIZE,

      category: categoryId || undefined,
      material: appliedMaterials.join(",") || undefined,
      color: appliedColors.join(",") || undefined,
      min_price: appliedPriceRange.min,
      max_price: appliedPriceRange.max,
      ordering: serverOrdering,
    }),
    [
      page,
      categoryId,
      appliedMaterials,
      appliedColors,
      appliedPriceRange,
      serverOrdering,
    ],
  );

  const { data, isFetching, isError } = useListProductsQuery(queryArgs);

  const products = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [data]);

  // ✅ Client-side price sort (guaranteed to work)
  const sortedProducts = useMemo(() => {
    if (!products || products.length === 0) return products;

    // only sort by price when selected
    if (appliedSort !== "price" && appliedSort !== "-price") return products;

    const dir = appliedSort === "price" ? 1 : -1;

    const copy = [...products];
    copy.sort((a, b) => {
      const ap = Number(resolveProductPrice(a) ?? 0);
      const bp = Number(resolveProductPrice(b) ?? 0);

      // keep stable if equal
      if (ap === bp) return Number(a?.id ?? 0) - Number(b?.id ?? 0);
      return (ap - bp) * dir;
    });
    return copy;
  }, [products, appliedSort]);

  const displayProducts = useMemo(() => {
    // If user selected a sort option, respect it (no random)
    if (appliedSort) return sortedProducts;

    // Featured (default) => show random but stable order
    // Use current page + categoryId in seed so each page/category looks different
    const seed =
      Number(shuffleSeedRef.current) +
      Number(page || 1) * 101 +
      Number(categoryId || 0) * 1009;

    return stableShuffle(sortedProducts, seed);
  }, [sortedProducts, appliedSort, page, categoryId]);

  const totalCount = useMemo(() => {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (typeof data.count === "number") return data.count;
    if (typeof data.total === "number") return data.total;
    return products.length;
  }, [data, products]);

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

  const categoryObj = homeCategories
    .filter((c) => String(c.link || "").startsWith(BASE_PATH))
    .find((c) => String(c.id) === String(categoryId));

  const pageTitle = categoryObj
    ? t("products.meta.categoryTitle", {
        category: t(categoryObj.label),
        defaultValue: `${t(categoryObj.label)} | MindMines`,
      })
    : t("products.meta.allTitle", {
        defaultValue: "Decorative Products | MindMines",
      });

  const pageDesc = categoryObj
    ? t("products.meta.categoryDescription", {
        category: t(categoryObj.label),
        defaultValue: `Explore ${t(categoryObj.label)} in marble, granite and onyx – handcrafted for modern European homes.`,
      })
    : t("products.meta.defaultDescription", {
        defaultValue:
          "Explore handcrafted marble, granite and onyx trays, bowls and decor designed for modern European homes.",
      });
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

  useEffect(() => {
    if (isPrerender) return;
    if (!products || products.length === 0) return;

    track({
      event_type: "page_view",
      session_id: undefined,
      url_path: "/decorative-products",
      extra: {
        category: categoryId || null,
        page,
        materials: appliedMaterials,
        colors: appliedColors,
        price_min: appliedPriceRange.min,
        price_max: appliedPriceRange.max,
        sort: appliedSort || null,
        count: products.length,
        _original_event_type: "product_list_view",
      },
    });
  }, [
    products,
    categoryId,
    page,
    appliedMaterials,
    appliedColors,
    appliedPriceRange,
    appliedSort,
    track,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    categoryId,
    appliedMaterialsKey,
    appliedColorsKey,
    appliedPriceRange,
    appliedSort,
  ]);

  const toggleWishlist = async (id) => {
    if (!isLoggedIn) return toast.warning(t("wishlist.loginRequired"));
    try {
      if (wlIds.has(id)) {
        await removeWish(id).unwrap();
        toast.info(t("wishlist.removedToast"));
        track({ event_type: "wishlist_remove", product_id: id });
      } else {
        await addWish(id).unwrap();
        toast.success(t("wishlist.addedToast"));
        track({ event_type: "wishlist_add", product_id: id });
      }
    } catch {
      toast.error(t("wishlist.actionFailed"));
    }
  };

  const onAddToCart = (p, priceFromTile) => {
    const unitPriceRaw =
      Number.isFinite(priceFromTile) && priceFromTile > 0
        ? priceFromTile
        : Number(resolveProductPrice(p) || 0);

    const baseGross = Number(p?.price_gross ?? p?.priceGross ?? 0);
    const finalGross = Number(p?.final_price_gross ?? p?.finalPriceGross ?? 0);

    // ✅ Strong fallback: prefer finalGross, else unitPriceRaw, else baseGross
    const unitGross =
      finalGross > 0 ? finalGross : unitPriceRaw > 0 ? unitPriceRaw : baseGross;

    const stockNum = Number(p?.stock ?? p?.quantity ?? 0);

    dispatch(
      addItem({
        id: p.id,
        productId: p.id, // ✅ keep consistent
        name: productTitle(p, lang),
        image: p.image,
        qty: 1,

        // ✅ IMPORTANT: store these for pricing.js
        price: unitGross, // fallback path
        priceRange: unitGross, // legacy fallback path
        price_gross: baseGross > 0 ? baseGross : unitGross,
        final_price_gross: finalGross > 0 ? finalGross : unitGross,
        discount_percent: Number(p?.discount_percent ?? 0),
        is_discounted: Boolean(p?.is_discounted),

        stock: Number.isFinite(stockNum) ? stockNum : 0,
        category: p?.category || "",
        color: p?.color || "",
        weight: p?.weight || "",
        dimensions: p?.dimensions || "",
      }),
    );

    navigate("/cart");
  };

  const handleQuickView = (p) => {
    setQuickViewProduct(p);
    track({ event_type: "product_quick_view", product_id: p.id });
  };

  // Apply / Reset (Filter drawer)
  const applyFilters = () => {
    setAppliedMaterials(draftMaterials);
    setAppliedColors(draftColors);
    setAppliedPriceRange(draftPriceRange);
    setIsFilterOpen(false);

    track({
      event_type: "filters_apply",
      extra: {
        category: categoryId || null,
        materials: draftMaterials,
        colors: draftColors,
        price_min: draftPriceRange.min,
        price_max: draftPriceRange.max,
        sort: appliedSort || null,
      },
    });
  };

  const resetFilters = () => {
    setDraftMaterials([]);
    setDraftColors([]);
    setDraftPriceRange(DEFAULT_PRICE);

    setAppliedMaterials([]);
    setAppliedColors([]);
    setAppliedPriceRange(DEFAULT_PRICE);

    setIsFilterOpen(false);

    track({ event_type: "filters_reset" });
  };

  const toggleDraftArrayValue = (setter) => (value) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const sortLabel = useMemo(() => {
    const found = SORT_OPTIONS.find((o) => o.value === (appliedSort || ""));
    if (!found)
      return t("products.sort.featured", { defaultValue: "Featured" });
    return t(found.labelKey, { defaultValue: found.fallback });
  }, [appliedSort, t, SORT_OPTIONS]);
  if (isPrerender) {
    return (
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack">
        <QuickViewModal
          open={!!quickViewProduct}
          product={quickViewProduct}
          lang={lang}
          wished={quickViewProduct ? wlIds.has(quickViewProduct.id) : false}
          onToggleWishlist={toggleWishlist}
          onAddToCart={(prod, priceNum) => onAddToCart(prod, priceNum)}
          onClose={() => setQuickViewProduct(null)}
        />

        {/* Filter Drawer */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsFilterOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-[92%] max-w-md bg-white dark:bg-neutral-900 shadow-xl p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold dark:text-white">
                  {t("products.filters.title", { defaultValue: "Filter" })}
                </h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="px-3 py-1 rounded-lg border dark:border-neutral-700 dark:text-white"
                >
                  {t("common.close", { defaultValue: "Close" })}
                </button>
              </div>

              {/* Stone */}
              <div className="mb-6 p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-neutral-900">
                <h4 className="font-semibold mb-2 dark:text-white">
                  {t("products.filters.material.title", {
                    defaultValue: "Stone",
                  })}
                </h4>
                {MATERIALS.map((m) => (
                  <label
                    key={m.value}
                    className="block mb-2 text-sm dark:text-gray-200"
                  >
                    <input
                      type="checkbox"
                      className="mr-2 rounded border-gray-300 dark:border-neutral-700"
                      checked={draftMaterials.includes(m.value)}
                      onChange={() =>
                        toggleDraftArrayValue(setDraftMaterials)(m.value)
                      }
                    />
                    {t(m.label, { defaultValue: m.value })}
                  </label>
                ))}
              </div>

              {/* Color */}
              <div className="mb-6 p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-neutral-900">
                <h4 className="font-semibold mb-2 dark:text-white">
                  {t("products.filters.color.title", { defaultValue: "Color" })}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {COLORS.map((c) => (
                    <label key={c.value} className="text-sm dark:text-gray-200">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 dark:border-neutral-700"
                        checked={draftColors.includes(c.value)}
                        onChange={() =>
                          toggleDraftArrayValue(setDraftColors)(c.value)
                        }
                      />
                      {t(c.label, { defaultValue: c.value })}
                    </label>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="mb-6 p-4 rounded-xl ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-neutral-900">
                <h4 className="font-semibold mb-2 dark:text-white">
                  {t("products.filters.price", { defaultValue: "Price" })}
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  {PRICE_BUCKETS.map((r) => (
                    <label
                      key={r.label}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="price_filter_drawer"
                        checked={
                          draftPriceRange.min === r.min &&
                          draftPriceRange.max === r.max
                        }
                        onChange={() =>
                          setDraftPriceRange({ min: r.min, max: r.max })
                        }
                        className="accent-backnewswhite"
                      />
                      <span>{r.label} €</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetFilters}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                >
                  {t("common.reset", { defaultValue: "Reset" })}
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 py-2 rounded-xl bg-backnewswhite text-white border border-backnewswhite"
                >
                  {t("common.apply", { defaultValue: "Apply" })}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="container max-w-7xl mx-auto px-4 py-8">
          <SEO title={pageTitle} description={pageDesc} canonical={canonical} />

          {/* ✅ H1 for SEO audit, but not visible */}
          <h1 className="sr-only">
            {categoryObj
              ? t(categoryObj.label)
              : t("products.h1", { defaultValue: "Decorative Products" })}
          </h1>

          {/* ✅ Keep your JSON-LD here (outside Helmet is fine) */}
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbJsonLd)}
          </script>
          {/* category chips */}
          <div className="flex gap-3 justify-center mb-4 flex-wrap">
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
              {t("All", { defaultValue: "All" })}
            </button>
          </div>

          {/* Filter / Sort bar */}
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setIsFilterOpen(true);
                  setIsSortOpen(false);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm
                         bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100
                         border-gray-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-backnewswhite/70"
              >
                <span className="inline-block">⎇</span>
                {t("products.filters.title", { defaultValue: "Filter" })}
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    setIsSortOpen((v) => !v);
                    setIsFilterOpen(false);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm
                           bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100
                           border-gray-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-backnewswhite/70"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t("products.sort.title", { defaultValue: "Sort By:" })}
                  </span>
                  <span className="text-sm font-medium">{sortLabel}</span>
                  <span className="select-none">{isSortOpen ? "▴" : "▾"}</span>
                </button>

                {isSortOpen && (
                  <div
                    className="absolute left-0 mt-2 w-72 rounded-xl border shadow-lg z-20
                             bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 overflow-hidden"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setAppliedSort(opt.value);
                          setIsSortOpen(false);
                          track({
                            event_type: "sort_change",
                            extra: {
                              sort: opt.value || "featured",
                              category: categoryId || null,
                            },
                          });
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition
                                  hover:bg-gray-50 dark:hover:bg-neutral-800
                                  ${appliedSort === opt.value ? "font-semibold" : ""}
                                  text-gray-900 dark:text-gray-100`}
                      >
                        {t(opt.labelKey, { defaultValue: opt.fallback })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">{totalCount}</span>{" "}
              {t("products.items", { defaultValue: "Items" })}
            </div>
          </div>

          {/* Grid */}
          {isFetching ? (
            <div className="text-center text-gray-500 dark:text-gray-300">
              {t("common.loading", { defaultValue: "Loading..." })}
            </div>
          ) : isError ? (
            <div className="text-center text-red-500">
              {t("products.error", { defaultValue: "Something went wrong." })}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-400">
              {t("products.noResults", { defaultValue: "No results found." })}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayProducts.map((p) => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10 flex-wrap">
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
        </div>
      </div>
    );
  }
}
