// components/PromoBanner.jsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  const timersRef = useRef({});

  const outerRef = useRef(null); // viewport
  const innerRef = useRef(null); // moving track
  const rafRef = useRef(null);

  const promos = useMemo(() => promosArr.filter(Boolean), [promosArr]);
  const show = promos.length > 0 && !hidden && !isFetching;

  // countdown per promo
  useEffect(() => {
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

  // JS-powered marquee animation (right -> left)
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;

    if (!show || !outer || !inner) return;

    const hasMultiple = promos.length > 1;
    const sequences = hasMultiple ? 2 : 1; // if we duplicated or not

    // total width of one full sequence
    const sequenceWidth = inner.scrollWidth / sequences;
    if (!sequenceWidth) return;

    let x = 0;
    let lastTs = performance.now();
    const speed = 40; // px per second

    const step = (ts) => {
      const dt = ts - lastTs;
      lastTs = ts;

      // move left
      x -= (speed * dt) / 1000;

      if (hasMultiple) {
        // seamless loop for 2+ promos
        if (x <= -sequenceWidth) {
          x = 0;
        }
      } else {
        // only ONE promo: when fully left, jump back to right side of viewport
        if (x <= -sequenceWidth) {
          x = outer.clientWidth;
        }
      }

      inner.style.transform = `translateX(${x}px)`;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      inner.style.transform = "translateX(0px)";
    };
  }, [show, promos.length]);

  const goCheckoutWith = (code) => {
    localStorage.setItem("coupon_auto", String(code).toUpperCase());
    navigate(`/checkout?coupon=${encodeURIComponent(code)}`);
  };

  if (!show) return null;

  const barBg = promos[0]?.bg_color || "#111827";
  const barFg = promos[0]?.text_color || "#ffffff";

  const hasMultiple = promos.length > 1;
  const renderItems = hasMultiple ? [...promos, ...promos] : promos;

  return (
    <div
      style={{ backgroundColor: barBg, color: barFg }}
      className="relative w-full border-b border-white/10 sticky top-0 z-50 select-none"
    >
      <div className="px-3 md:px-6 py-2 text-sm flex items-center gap-2">
        {/* scrolling viewport */}
        <div ref={outerRef} className="flex-1 min-w-0 overflow-hidden">
          <div
            ref={innerRef}
            className="inline-flex whitespace-nowrap items-center"
            style={{ willChange: "transform" }}
          >
            {renderItems.map((p, idx) => {
              const fg = p.text_color || barFg;
              const key = `${p.id}-${idx}`;
              return (
                <div
                  key={key}
                  className="inline-flex items-center gap-3 md:gap-4 px-4 shrink-0"
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

        {/* close button */}
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
