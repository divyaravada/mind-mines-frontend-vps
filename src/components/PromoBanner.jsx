// components/PromoBanner.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGetActivePromotionQuery } from "../features/promos/promosApi";

function diffSecondsToNow(iso) {
  if (!iso) return null;
  const end = new Date(iso);
  const now = new Date();
  if (isNaN(end.getTime())) return null;
  return Math.max(0, Math.floor((end - now) / 1000));
}

const fmt = (s) =>
  typeof s === "number" && s >= 0
    ? `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(
        Math.floor((s % 3600) / 60)
      ).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
    : "00:00:00";

export default function PromoBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: promosArr = [], isFetching } = useGetActivePromotionQuery();

  const [hidden, setHidden] = useState(false);
  const [remainingMap, setRemainingMap] = useState({});
  const [hasOverflow, setHasOverflow] = useState(false);

  const stripRef = useRef(null);
  const timersRef = useRef({});

  const promos = useMemo(() => promosArr.filter(Boolean), [promosArr]);
  const show = promos.length > 0 && !hidden && !isFetching;

  // countdown per promo
  useEffect(() => {
    // clear old timers
    Object.values(timersRef.current).forEach(clearInterval);
    timersRef.current = {};

    if (!show) {
      setRemainingMap({});
      return;
    }

    const next = {};
    promos.forEach((p) => {
      next[p.id] = diffSecondsToNow(p.end_at);
      timersRef.current[p.id] = setInterval(() => {
        setRemainingMap((m) => ({
          ...m,
          [p.id]: typeof m[p.id] === "number" ? Math.max(0, m[p.id] - 1) : 0,
        }));
      }, 1000);
    });
    setRemainingMap(next);

    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
      timersRef.current = {};
    };
  }, [show, promos]);

  // overflow detection
  const recalc = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    if (!show) {
      setHasOverflow(false);
      return;
    }

    recalc();

    const ro = new ResizeObserver(recalc);
    ro.observe(el);

    const onResize = () => recalc();
    window.addEventListener("resize", onResize);

    // images might change width
    el.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", recalc, { once: true });
    });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [show, recalc, promos.length]);

  const goCheckoutWith = (code) => {
    localStorage.setItem("coupon_auto", String(code).toUpperCase());
    navigate(`/checkout?coupon=${encodeURIComponent(code)}`);
  };

  const scrollByPx = (px) =>
    stripRef.current?.scrollBy({ left: px, behavior: "smooth" });

  const onWheel = (e) => {
    const el = stripRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: "auto" });
    }
  };

  // ⬇️ early return AFTER hooks
  if (!show) return null;

  // Use first promo’s palette as bar chrome
  const barBg = promos[0].bg_color || "#111827";
  const barFg = promos[0].text_color || "#ffffff";

  return (
    <div
      style={{ backgroundColor: barBg, color: barFg }}
      className="relative w-full border-b border-white/10"
    >
      <div className="px-3 md:px-6 py-2 text-sm flex items-center gap-2">
        {hasOverflow && (
          <button
            type="button"
            onClick={() => scrollByPx(-280)}
            className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded bg-white/10 hover:bg-white/20 border border-white/20"
            aria-label={t("promo.scrollLeft", "Scroll left")}
          >
            ‹
          </button>
        )}

        <div
          ref={stripRef}
          onWheel={onWheel}
          className="flex-1 basis-0 min-w-0 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x"
        >
          <div className="w-max whitespace-nowrap inline-flex items-center gap-6 pr-3">
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
                  <span
                    className="font-semibold shrink-0"
                    style={{ color: fg }}
                  >
                    {p.headline}
                  </span>
                  {p.subheadline && (
                    <span className="opacity-90 shrink-0" style={{ color: fg }}>
                      {p.subheadline}
                    </span>
                  )}
                  {typeof remainingMap[p.id] === "number" && (
                    <span
                      className="text-xs opacity-90 shrink-0"
                      style={{ color: fg }}
                    >
                      {t("promo.endsIn", { time: fmt(remainingMap[p.id]) })}
                    </span>
                  )}
                  {p.code && (
                    <button
                      onClick={() => goCheckoutWith(p.code)}
                      className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
                      style={{ color: fg }}
                    >
                      {t("promo.applyCoupon", {
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
                      {t("promo.shopNow")}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {hasOverflow && (
          <button
            type="button"
            onClick={() => scrollByPx(280)}
            className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded bg-white/10 hover:bg-white/20 border border-white/20"
            aria-label={t("promo.scrollRight", "Scroll right")}
          >
            ›
          </button>
        )}

        <button
          onClick={() => setHidden(true)}
          className="ml-1 px-2 py-1 rounded hover:bg-white/10 shrink-0"
          aria-label={t("promo.hide")}
          title={t("promo.hide")}
        >
          ×
        </button>
      </div>
    </div>
  );
}
