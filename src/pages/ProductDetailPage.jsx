import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactPlayer from "react-player";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { productTitle } from "../lib/i18n";
import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../features/cart/cartSlice";
import {
  useGetProductQuery,
  useListProductsQuery,
  useCreateProductReviewMutation,
  useSuggestProductsQuery,
  useCreateOnDemandRequestMutation,
} from "../features/products/productsApi";
import {
  fmtEUR,
  resolveProductPrice,
  resolveBaseGross,
  hasDiscount as hasDiscountCalc,
} from "../lib/money";
import StarRating from "../components/StarRating";
import ProductReviews from "../components/ProductReviews";
import LowStockBanner from "../components/LowStockBanner";
import OnDemandModal from "../components/OnDemandModal";
import OutOfStockNotify from "../components/OutOfStockNotify";
import { Heart } from "lucide-react";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import {
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";

export default function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const locale = i18n.language || "en";
  const lang = i18n.language.startsWith("de") ? "de" : "en";

  const { data: product, isLoading } = useGetProductQuery(id);

  const isLoggedIn = useSelector(selectIsAuthenticated);
  const userEmail = useSelector((s) => s?.auth?.user?.email);

  const { data: wlRaw } = useGetWishlistQuery(undefined, { skip: !isLoggedIn });
  const [addWish] = useAddToWishlistMutation();
  const [removeWish] = useRemoveFromWishlistMutation();

  const wl = useMemo(() => {
    if (!wlRaw) return [];
    if (Array.isArray(wlRaw)) return wlRaw;
    if (Array.isArray(wlRaw?.results)) return wlRaw.results;
    return [];
  }, [wlRaw]);

  const wlIds = useMemo(() => new Set(wl.map((w) => Number(w.product))), [wl]);
  const wished = useMemo(
    () => (product ? wlIds.has(Number(product.id)) : false),
    [product, wlIds]
  );

  const toggleWishlist = async () => {
    if (!product) return;
    if (!isLoggedIn) {
      alert(t("wishlist.loginRequired"));
      return;
    }
    try {
      if (wished) await removeWish(product.id).unwrap();
      else await addWish(product.id).unwrap();
    } catch {}
  };

  const [openDemand, setOpenDemand] = useState(false);
  const [createDemand, { isSuccess: sentOk, error: sendErr }] =
    useCreateOnDemandRequestMutation();

  const suggestSeed = product
    ? product.title_en || product.title_de || String(product.id)
    : "";

  const { data: suggestData } = useSuggestProductsQuery(suggestSeed, {
    skip: !suggestSeed,
  });

  const suggested = useMemo(() => {
    if (!suggestData) return [];
    return Array.isArray(suggestData)
      ? suggestData
      : suggestData?.results ?? [];
  }, [suggestData]);

  const { data: relatedResp } = useListProductsQuery(
    product?.category
      ? { category: product.category, page_size: 12 }
      : undefined,
    { skip: !product?.category }
  );

  const relatedByCategory = useMemo(() => {
    if (!relatedResp) return [];
    return Array.isArray(relatedResp)
      ? relatedResp
      : relatedResp?.results ?? [];
  }, [relatedResp]);

  const recommend = useMemo(() => {
    // 1) merge suggested + related
    const seen = new Set();
    const merged = [...(suggested || []), ...(relatedByCategory || [])].filter(
      (p) => {
        if (!p) return false;
        const pid = String(p.id);
        if (seen.has(pid)) return false;
        seen.add(pid);
        return true;
      }
    );

    if (!merged.length) return [];

    const selfId = String(id);

    // 2) try to remove the current product
    const filtered = merged.filter((p) => String(p.id) !== selfId);

    // 3) if removing self leaves nothing (e.g. only 1 product exists),
    //    fall back to showing the merged list including self
    const base = filtered.length ? filtered : merged;

    return base.slice(0, 8);
  }, [suggested, relatedByCategory, id]);

  const [createReview] = useCreateProductReviewMutation();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("details");
  const [revRating, setRevRating] = useState(5);
  const [revMessage, setRevMessage] = useState("");
  const fileRef = useRef(null);

  const toNumber = (v) => {
    if (typeof v === "number") return v;
    const s = String(v || "")
      .replace(/[^\d.,-]/g, "")
      .replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  useEffect(() => setQty(1), [id]);

  if (isLoading)
    return (
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack flex items-center justify-center">
        {t("common.loading")}
      </div>
    );
  if (!product)
    return (
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack flex items-center justify-center">
        {t("common.notFound")}
      </div>
    );

  // SEO
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://mindmines.eu";
  const url = `${currentOrigin}/products/${product.id}/`;
  const title = `${productTitle(product, lang)} | MindMines`;
  const description =
    product[`short_description1_${lang}`] ||
    product[`short_description2_${lang}`] ||
    product[`short_description3_${lang}`] ||
    productTitle(product, lang);

  const mediaImgs = Array.isArray(product.media)
    ? product.media
        .filter((m) => m && m.media_type !== "video" && m.image)
        .map((m) => m.image)
    : [];
  const image =
    mediaImgs[0] || product.image || `${currentOrigin}/og-default.jpg`;
  const priceNumber = resolveProductPrice(product);
  const baseGross = resolveBaseGross(product);
  const discounted =
    typeof product?.is_discounted === "boolean"
      ? product.is_discounted
      : hasDiscountCalc(product);

  const stockNum = Number(product?.stock ?? product?.quantity ?? 0);
  const isOut = stockNum <= 0;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productTitle(product, lang),
    image: [image],
    description,
    sku: product.key || String(product.id),
    brand: { "@type": "Brand", name: "MindMines" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: priceNumber.toFixed(2),
      availability:
        stockNum > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.average_rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(product.average_rating),
            reviewCount: String(product.reviews_count || 0),
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: currentOrigin },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: `${currentOrigin}/products/`,
      },
      ...(product.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: t("categories." + product.category + ".heading"),
              item: `${currentOrigin}/decorative-products/category/${product.category}/`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: 4,
        name: productTitle(product, lang),
        item: url,
      },
    ],
  };

  const handleAddToCart = () => {
    const unit = resolveProductPrice(product);
    dispatch(
      addItem({
        id: product.id,
        name: productTitle(product, lang),
        image: product.image,
        price: toNumber(unit),
        qty,
        category: product.category,
        dimensions: product.dimensions,
        weight: product.weight,
        color: product.color,
      })
    );
    navigate("/cart");
  };

  const submitReview = async () => {
    const fd = new FormData();
    fd.append("rating", String(revRating));
    fd.append("message", revMessage || "");
    if (fileRef.current?.files?.[0])
      fd.append("image", fileRef.current.files[0]);
    await createReview({ id, form: fd }).unwrap();
    setRevRating(5);
    setRevMessage("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const rawDelivery = t("productDetail.policy.delivery_content", {
    returnObjects: true,
  });

  const rawReturns = t("productDetail.policy.returns_content", {
    returnObjects: true,
  });

  const toArray = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return [v];
    return [];
  };

  const deliveryLines = toArray(rawDelivery);
  const returnsLines = toArray(rawReturns);

  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-12">
        <Helmet>
          <title>{title}</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={url} />
          <meta property="og:type" content="product" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={url} />
          <meta property="og:image" content={image} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:image" content={image} />
          <script type="application/ld+json">
            {JSON.stringify(productJsonLd)}
          </script>
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbJsonLd)}
          </script>
        </Helmet>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* MEDIA */}
          <div className="w-full lg:w-1/2">
            <div className="bg-white dark:bg-neutral-900 dark:text-backnewsdark rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-2">
              <Carousel
                showThumbs
                showStatus={false}
                infiniteLoop
                useKeyboardArrows
                dynamicHeight
                className="rounded-lg"
              >
                {product.media?.length
                  ? product.media.map((m, i) =>
                      m.media_type === "video" && m.video ? (
                        <div key={i} className="aspect-square">
                          <ReactPlayer src={m.video} controls width="100%" />
                        </div>
                      ) : (
                        <div key={i}>
                          <img
                            src={m.image}
                            alt={`${productTitle(product, lang)} – ${i + 1}`}
                          />
                        </div>
                      )
                    )
                  : [
                      <div key="default">
                        <img
                          src={product.image}
                          alt={productTitle(product, lang)}
                        />
                      </div>,
                    ]}
              </Carousel>
            </div>
          </div>

          {/* INFO */}
          <div className="flex-1 flex flex-col gap-4 dark:text-backnewsdark">
            <div className="text-xs text-gray-500">
              {t("Key")}: {product.key}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  {productTitle(product, lang)}
                </h1>
                <div className="text-sm text-gray-500">
                  {t("home.categories." + product.category + ".heading")}
                </div>
              </div>

              <button
                onClick={toggleWishlist}
                className={`p-2 rounded-lg ring-1 ring-black/5 dark:ring-white/10 ${
                  wished ? "text-red-500" : "text-gray-400"
                }`}
                title={t("wishlist.addRemove", "Add / remove from wishlist")}
                aria-label={t(
                  "wishlist.addRemove",
                  "Add / remove from wishlist"
                )}
              >
                <Heart
                  className="w-6 h-6"
                  fill={wished ? "currentColor" : "none"}
                />
              </button>
            </div>

            <div className="text-xl font-bold flex items-center gap-2">
              <span>{fmtEUR(priceNumber, locale)}</span>
              {discounted && baseGross > 0 && (
                <span className="text-sm line-through text-gray-500">
                  {fmtEUR(baseGross, locale)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {t("product.inclVat", "incl. 19% VAT")}
            </div>

            <div className="space-y-2 text-gray-800 dark:text-gray-200">
              <p>{product[`short_description1_${lang}`]}</p>
              <p>{product[`short_description2_${lang}`]}</p>
              <p>{product[`short_description3_${lang}`]}</p>
            </div>

            <div>
              <strong>{t("dimension")}:</strong> {product.dimensions}
            </div>
            <div>
              <strong>{t("weight")}:</strong> {product.weight} kg
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="qty" className="font-medium">
                {t("productDetail.quantity")}:
              </label>
              <input
                id="qty"
                type="number"
                min={1}
                max={product.quantity || 99}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent"
              />
            </div>

            <p>
              <strong>{t("stock")}:</strong> {product.quantity}
            </p>

            <LowStockBanner stock={stockNum} />

            {isOut && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t("product.orderOnDemand", "Order can be taken on demand.")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenDemand(true)}
                    className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-marbleblack"
                  >
                    {t("product.orderOnDemandCta", "Order on demand")}
                  </button>
                  <OutOfStockNotify productId={product.id} />
                </div>
                {sendErr && (
                  <div className="text-xs text-red-600">
                    {sendErr?.data?.detail ||
                      "Couldn’t send your request. Please try again."}
                  </div>
                )}
                {sentOk && (
                  <div className="text-xs text-backnewsdark">
                    {t("product.requestOk", "Thanks! We’ll contact you soon.")}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleAddToCart}
              className="mt-4 w-full inline-flex items-center justify-center py-3 rounded-lg bg-backnewswhite text-white font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-marbleblack transition"
            >
              {t("productDetail.addToCart")}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-4">
          {/* TAB HEADERS */}
          <div className="flex flex-col sm:flex-row sm:overflow-x-auto no-scrollbar gap-2 sm:border-b dark:sm:border-neutral-800">
            {["details", "care", "policy"].map((key) => (
              <button
                key={key}
                className={`py-2 px-4 font-semibold text-left whitespace-nowrap transition rounded-lg sm:rounded-none sm:-mb-px
          ${
            activeTab === key
              ? "bg-backnewswhite/10 text-backnewswhite sm:bg-transparent sm:border-b-2 sm:border-backnewswhite"
              : "text-gray-600 dark:text-gray-300 hover:text-backnewswhite"
          }`}
                onClick={() => setActiveTab(key)}
              >
                {key === "details"
                  ? t("productDetail.tabs.details")
                  : key === "care"
                  ? t("productDetail.tabs.care")
                  : t("productDetail.tabs.policy")}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="mt-6 space-y-4 text-gray-800 dark:text-gray-200">
            {/* ✅ DETAILS – from backend */}
            {activeTab === "details" && (
              <>
                {[1, 2, 3].map((n) => {
                  const v = product[`descriptionpara${n}_${lang}`];
                  return typeof v === "string" || typeof v === "number" ? (
                    <p key={n}>{v}</p>
                  ) : null;
                })}
              </>
            )}

            {/* ✅ CARE – from translation.json */}
            {activeTab === "care" && (
              <div className="space-y-3 text-sm leading-relaxed">
                <p>{t("productDetail.policy.careText")}</p>
              </div>
            )}

            {/* ✅ POLICY – from translation.json */}
            {activeTab === "policy" && (
              <div className="space-y-6 text-sm leading-relaxed">
                {/* Delivery */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">
                    {t("productDetail.policy.delivery")}
                  </h3>
                  {deliveryLines.map((line, i) => {
                    const ci = line.indexOf(":");
                    if (ci !== -1) {
                      const title = line.slice(0, ci).trim();
                      const content = line.slice(ci + 1).trim();
                      return (
                        <p key={i}>
                          <span className="font-semibold">{title}:</span>{" "}
                          {content}
                        </p>
                      );
                    }
                    return <p key={i}>{line}</p>;
                  })}
                </section>

                {/* Returns */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">
                    {t("productDetail.policy.returns")}
                  </h3>
                  {returnsLines.map((line, i) => {
                    const ci = line.indexOf(":");
                    if (ci !== -1) {
                      const title = line.slice(0, ci).trim();
                      const content = line.slice(ci + 1).trim();
                      return (
                        <p key={i}>
                          <span className="font-semibold">{title}:</span>{" "}
                          {content}
                        </p>
                      );
                    }
                    return <p key={i}>{line}</p>;
                  })}
                </section>
              </div>
            )}
          </div>
        </div>

        {/* REVIEWS */}
        <ProductReviews productId={product.id} />

        {/* WRITE REVIEW */}
        <div className="p-4 rounded-xl bg-white dark:text-backnewsdark dark:bg-neutral-900 shadow-sm ring-1 ring-black/5 dark:ring-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <label className="font-medium">{t("productReviews.title")}:</label>
            <StarRating value={revRating} onChange={setRevRating} />
          </div>
          <div>
            <label className="block font-medium mb-1">
              {t("productReviews.messageLabel")}
            </label>
            <textarea
              value={revMessage}
              onChange={(e) => setRevMessage(e.target.value)}
              className="w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent"
              rows={4}
              placeholder={t("productReviews.messagePlaceholder")}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="block text-sm text-gray-700 dark:text-gray-300"
          />
          <button
            onClick={submitReview}
            className="px-4 py-2 bg-backnewswhite text-white rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-marbleblack"
          >
            {t("productReviews.submit")}
          </button>
        </div>

        {/* Suggestions */}
        {recommend.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4 dark:text-backnewsdark">
              {t("productReviews.youMay")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {recommend.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/products/${p.id}`)}
                  className="bg-white dark:text-backnewsdark dark:bg-neutral-900 rounded-xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/5 hover:shadow-md text-left transition"
                >
                  <img
                    src={p.image}
                    alt={productTitle(p, lang)}
                    className="w-full h-40 object-cover rounded-lg mb-2"
                  />
                  <div className="font-semibold truncate">
                    {productTitle(p, lang)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {fmtEUR(resolveProductPrice(p), locale)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <OnDemandModal
          open={openDemand}
          onClose={() => setOpenDemand(false)}
          initialEmail={userEmail}
          productId={product.id}
          onSubmit={async (payload) => {
            await createDemand(payload).unwrap();
            setOpenDemand(false);
          }}
        />
      </div>
    </div>
  );
}
