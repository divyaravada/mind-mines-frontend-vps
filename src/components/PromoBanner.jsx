// components/PromoBanner.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGetActivePromotionQuery } from "../features/promos/promosApi";

function secondsUntil(iso) {
  if (!iso) return null;
  const end = new Date(iso);
  const s = Math.floor((end - new Date()) / 1000);
  return isNaN(end.getTime()) ? null : Math.max(0, s);
}
const fmt = (s) => {
  if (typeof s !== "number" || s < 0) return "00:00:00";
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

export default function PromoBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: promosArr = [], isFetching } = useGetActivePromotionQuery();

  const promos = useMemo(() => promosArr.filter(Boolean), [promosArr]);
  const [hidden, setHidden] = useState(false);
  const [remaining, setRemaining] = useState({});
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const stripRef = useRef(null);
  const timersRef = useRef({});
  const drag = useRef({ on: false, startX: 0, startScroll: 0 });

  const show = promos.length > 0 && !hidden && !isFetching;
  if (!show) return null;

  const barBg = promos[0]?.bg_color || "#0f172a";
  const barFg = promos[0]?.text_color || "#ffffff";

  // countdowns
  useEffect(() => {
    Object.values(timersRef.current).forEach(clearInterval);
    timersRef.current = {};
    const init = {};
    promos.forEach((p) => {
      init[p.id] = secondsUntil(p.end_at);
      timersRef.current[p.id] = setInterval(() => {
        setRemaining((prev) => ({
          ...prev,
          [p.id]:
            typeof prev[p.id] === "number" ? Math.max(0, prev[p.id] - 1) : 0,
        }));
      }, 1000);
    });
    setRemaining(init);
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
      timersRef.current = {};
    };
  }, [promos.length]);

  // overflow and arrow enablement
  const recompute = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    setHasOverflow(overflow);
    setCanL(el.scrollLeft > 0);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    const onScroll = () => recompute();
    const onResize = () => recompute();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    el.querySelectorAll("img").forEach((img) => {
      if (!img.complete)
        img.addEventListener("load", recompute, { once: true });
    });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [recompute, promos.length]);

  const scrollByPx = (px) =>
    stripRef.current?.scrollBy({ left: px, behavior: "smooth" });

  // drag-to-scroll
  const onPointerDown = (e) => {
    const el = stripRef.current;
    if (!el) return;
    drag.current.on = true;
    drag.current.startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    drag.current.startScroll = el.scrollLeft;
    el.setPointerCapture?.(e.pointerId || 1);
  };
  const onPointerMove = (e) => {
    if (!drag.current.on) return;
    const el = stripRef.current;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    el.scrollLeft = drag.current.startScroll - (x - drag.current.startX);
  };
  const onPointerEnd = (e) => {
    if (!drag.current.on) return;
    drag.current.on = false;
    stripRef.current?.releasePointerCapture?.(e.pointerId || 1);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByPx(-320);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByPx(320);
    }
  };

  const goCheckoutWith = (code) => {
    localStorage.setItem("coupon_auto", String(code).toUpperCase());
    navigate(`/checkout?coupon=${encodeURIComponent(code)}`);
  };

  return (
    <div
      style={{ backgroundColor: barBg, color: barFg }}
      className="relative z-40 w-full border-b border-white/10"
    >
      <div className="px-3 md:px-6 py-2 text-sm flex items-center gap-2">
        {hasOverflow && (
          <button
            type="button"
            disabled={!canL}
            onClick={() => scrollByPx(-320)}
            className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20"
            aria-label={t("promo.scrollLeft", "Scroll left")}
            title={t("promo.scrollLeft", "Scroll left")}
          >
            ‹
          </button>
        )}

        {/* The actual scroll element */}
        <div
          ref={stripRef}
          role="region"
          aria-label={t("promo.promotions", "Active promotions")}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="flex-1 basis-0 min-w-0 no-scrollbar overflow-x-auto scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing inline-flex whitespace-nowrap items-center gap-6 pr-3"
        >
          {promos.map((p) => {
            const fg = p.text_color || barFg;
            return (
              <div
                key={p.id}
                className="inline-flex items-center gap-3 md:gap-4 shrink-0"
              >
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-6 w-6 object-contain rounded shrink-0"
                  />
                )}
                <span className="font-semibold shrink-0" style={{ color: fg }}>
                  {p.headline}
                </span>
                {p.subheadline && (
                  <span className="opacity-90 shrink-0" style={{ color: fg }}>
                    {p.subheadline}
                  </span>
                )}
                {typeof remaining[p.id] === "number" && (
                  <span
                    className="text-xs opacity-90 shrink-0"
                    style={{ color: fg }}
                  >
                    {t("promo.endsIn", "Ends in {{time}}", {
                      time: fmt(remaining[p.id]),
                    })}
                  </span>
                )}
                {p.code && (
                  <button
                    onClick={() => goCheckoutWith(p.code)}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
                    style={{ color: fg }}
                  >
                    {t("promo.applyCoupon", "Apply {{code}}", {
                      code: String(p.code).toUpperCase(),
                    })}
                  </button>
                )}
                {p.link_url && (
                  <a
                    href={p.link_url}
                    className="underline underline-offset-2 hover:opacity-90 shrink-0"
                    style={{ color: fg }}
                  >
                    {t("promo.shopNow", "Shop now")}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {hasOverflow && (
          <button
            type="button"
            disabled={!canR}
            onClick={() => scrollByPx(320)}
            className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20"
            aria-label={t("promo.scrollRight", "Scroll right")}
            title={t("promo.scrollRight", "Scroll right")}
          >
            ›
          </button>
        )}

        <button
          onClick={() => setHidden(true)}
          className="ml-1 px-2 py-1 rounded hover:bg-white/10 shrink-0"
          aria-label={t("promo.hide", "Hide")}
          title={t("promo.hide", "Hide")}
        >
          ×
        </button>
      </div>
    </div>
  );
}
