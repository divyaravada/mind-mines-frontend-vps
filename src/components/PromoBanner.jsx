// src/components/PromoBanner.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useGetActivePromotionQuery } from "../features/promos/promosApi";

function diffSecondsToNow(iso) {
  if (!iso) return null;
  const end = new Date(iso);
  const now = new Date();
  if (isNaN(end.getTime())) return null;
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
}

function formatSeconds(s) {
  if (typeof s !== "number" || s < 0) return null;
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function PromoBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // use RTK Query (already created in promosApi)
  const { data: promo, isFetching } = useGetActivePromotionQuery();

  const [hidden, setHidden] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const raf = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  const tickRef = useRef(null);
  const stripRef = useRef(null);
  const trackRef = useRef(null);

  const active = !!promo?.active;
  const show = active && !hidden && !isFetching;

  // compute remaining from end_at (backend doesn’t send remaining_seconds)
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!promo?.end_at || !show) return;
    const initial = diffSecondsToNow(promo.end_at);
    setRemaining(initial);
    tickRef.current = setInterval(() => {
      setRemaining((s) => (typeof s === "number" ? Math.max(0, s - 1) : s));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [promo?.end_at, show]);

  // overflow measure helper
  const recalcOverflow = useCallback(() => {
    const el = stripRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    // margin of error for subpixel rounding
    const overflow = track.scrollWidth - el.clientWidth > 4;
    setHasOverflow(overflow);
  }, []);

  // 4) after promo loads, measure again on next paint
  useEffect(() => {
    if (!show) return;
    raf(recalcOverflow);
  }, [show, recalcOverflow]);

  // observe width changes & window resizes
  useEffect(() => {
    if (!show) return;
    const el = stripRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    recalcOverflow();

    const ro = new ResizeObserver(recalcOverflow);
    ro.observe(el);
    ro.observe(track);
    const onResize = () => recalcOverflow();
    window.addEventListener("resize", onResize);

    // after images load
    const imgs = track.querySelectorAll("img");
    imgs.forEach((img) => {
      if (!img.complete)
        img.addEventListener("load", recalcOverflow, { once: true });
    });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [show, recalcOverflow]);

  // formatted time
  const hhmmss = formatSeconds(remaining);

  if (!show) return null;

  const bg = promo.bg_color || "#17160f";
  const fg = promo.text_color || "#ffffff";

  const apply = () => {
    if (promo?.code) {
      const code = String(promo.code).toUpperCase();
      localStorage.setItem("coupon_auto", code);
      sessionStorage.setItem("coupon_auto_once", code); // optional extra signal
      // also broadcast an event in case Checkout is already mounted
      window.dispatchEvent(
        new CustomEvent("mindmines:apply-coupon", { detail: { code } })
      );
    }
    if (!location.pathname.startsWith("/checkout")) navigate("/checkout");
  };

  const scrollByPx = (px) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: px, behavior: "smooth" });
  };

  const onWheelToHorizontal = (e) => {
    const el = stripRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: "auto" });
    }
  };

  return (
    <div
      ref={trackRef}
      style={{ backgroundColor: bg, color: fg }}
      className="relative w-full border-b border-white/10"
    >
      <div className="px-3 md:px-6 py-2 text-sm flex items-center gap-2">
        {/* Left arrow */}
        {hasOverflow && (
          <button
            type="button"
            aria-label={t("promo.scrollLeft", "Scroll left")}
            onClick={() => scrollByPx(-280)}
            className="hidden sm:inline-flex shrink-0 items-center justify-center h-7 w-7 rounded bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            style={{ color: fg }}
          >
            ‹
          </button>
        )}

        {/* Scrollable strip */}
        <div
          ref={stripRef}
          onWheel={onWheelToHorizontal}
          className="w-full min-w-0 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x"
          // NOTE: add a subtle mask back once validated:
          // style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)" }}
        >
          {/* Track must not wrap, so overflow can happen horizontally */}
          <div
            ref={trackRef}
            className="w-max whitespace-nowrap inline-flex items-center gap-3 md:gap-4"
          >
            {/* image uses image_url */}
            {promo.image_url && (
              <img
                src={promo.image_url}
                alt=""
                className="h-6 w-6 inline-block align-middle object-contain rounded shrink-0"
                onLoad={recalcOverflow}
                onError={recalcOverflow}
              />
            )}

            <span className="inline-block font-semibold shrink-0">
              {promo.headline}
            </span>

            {promo.subheadline && (
              <span className="inline-block opacity-90 shrink-0">
                {promo.subheadline}
              </span>
            )}

            {hhmmss && (
              <span className="inline-block text-xs opacity-90 shrink-0">
                {t("promo.endsIn", { time: hhmmss })}
              </span>
            )}

            {promo.code && (
              <button
                onClick={apply}
                className="inline-flex items-center px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20 transition-colors shrink-0"
                style={{ color: fg }}
                title={t("promo.applyTitle")}
              >
                {t("promo.applyCoupon", {
                  code: String(promo.code).toUpperCase(),
                })}
              </button>
            )}

            {promo.link_url && (
              <a
                href={promo.link_url}
                className="inline-block underline underline-offset-2 hover:opacity-90 shrink-0"
                style={{ color: fg }}
              >
                {t("promo.shopNow")}
              </a>
            )}
          </div>
        </div>

        {/* Right arrow */}
        {hasOverflow && (
          <button
            type="button"
            aria-label={t("promo.scrollRight", "Scroll right")}
            onClick={() => scrollByPx(280)}
            className="hidden sm:inline-flex shrink-0 items-center justify-center h-7 w-7 rounded bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            style={{ color: fg }}
          >
            ›
          </button>
        )}

        {/* Close */}
        <button
          onClick={() => setHidden(true)}
          className="ml-1 px-2 py-1 rounded hover:bg-white/10 shrink-0"
          style={{ color: fg }}
          aria-label={t("promo.hide")}
          title={t("promo.hide")}
        >
          {"\u00d7"}
        </button>
      </div>
    </div>
  );
}
