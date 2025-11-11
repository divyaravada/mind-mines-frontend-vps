import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import http from "../services/http";

function formatSeconds(s) {
  if (typeof s !== "number" || s < 0) return null;
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function PromoBanner() {
  const { t } = useTranslation();
  const [promo, setPromo] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const tickRef = useRef(null);
  const stripRef = useRef(null);

  // fetch active promo
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await http.get("promotions/active/");
        if (!mounted) return;
        if (r.data?.active) {
          setPromo(r.data);
          setRemaining(r.data.remaining_seconds ?? null);
        } else {
          setPromo(null);
        }
      } catch {
        if (mounted) setPromo(null);
      }
    })();
    return () => {
      mounted = false;
      clearInterval(tickRef.current);
    };
  }, []);

  // countdown timer
  useEffect(() => {
    if (!promo || typeof remaining !== "number") return;
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setRemaining((s) => (typeof s === "number" ? Math.max(0, s - 1) : s));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [promo, remaining]);

  // detect horizontal overflow (show arrows only when needed)
  const measureOverflow = () => {
    const el = stripRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 2);
  };

  useEffect(() => {
    measureOverflow();
    window.addEventListener("resize", measureOverflow);
    return () => window.removeEventListener("resize", measureOverflow);
  }, [promo, remaining]);

  const hhmmss = formatSeconds(remaining);
  const show = !!promo && !hidden;
  if (!show) return null;

  // palette from server or brand defaults
  const bg = promo.bg_color || "#17160f"; // marbleblack
  const fg = promo.text_color || "#ffffff";

  const apply = () => {
    if (promo?.code) {
      localStorage.setItem("coupon_auto", String(promo.code).toUpperCase());
    }
    if (!location.pathname.startsWith("/checkout")) navigate("/checkout");
  };

  // horizontal scroll helpers
  const scrollByPx = (px) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: px, behavior: "smooth" });
  };

  const onWheelToHorizontal = (e) => {
    // convert vertical wheel to horizontal scroll for this strip
    const el = stripRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: "auto" });
    }
  };

  // --- overflow detector (put near measureOverflow/useEffect) ---
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setHasOverflow(el.scrollWidth > el.clientWidth + 2);
    });
    ro.observe(el);
    measureOverflow(); // initial
    window.addEventListener("resize", measureOverflow);
    return () => {
      window.removeEventListener("resize", measureOverflow);
      ro.disconnect();
    };
  }, [promo]);

  return (
    <div
      style={{ backgroundColor: bg, color: fg }}
      className="relative w-full border-b border-white/10"
    >
      <div
        className="
          px-3 md:px-6 py-2 text-sm flex items-center gap-2
        "
      >
        {/* SCROLL BUTTONS (left) */}
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

        {/* SCROLLABLE STRIP */}
        <div
          ref={stripRef}
          onWheel={onWheelToHorizontal}
          className="
    flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth
    whitespace-nowrap flex items-center gap-3 md:gap-4
    [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]
  "
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
          }}
        >
          {promo.image && (
            <img
              src={promo.image}
              alt=""
              className="h-6 w-6 inline-block align-middle object-contain rounded shrink-0"
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
              className="
        inline-flex items-center px-3 py-1 rounded
        bg-white/10 hover:bg-white/20
        border border-white/20 transition-colors shrink-0
      "
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

        {/* SCROLL BUTTONS (right) */}
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
