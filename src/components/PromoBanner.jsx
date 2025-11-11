// src/components/PromoBanner.jsx
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
  const navigate = useNavigate();
  const location = useLocation();
  const tickRef = useRef(null);

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

  const hhmmss = formatSeconds(remaining);
  const show = !!promo && !hidden;
  if (!show) return null;

  // server can override; otherwise default integrates with your palette
  const bg = promo.bg_color || "#17160f"; // marbleblack
  const fg = promo.text_color || "#ffffff";

  const apply = () => {
    if (promo?.code) {
      localStorage.setItem("coupon_auto", String(promo.code).toUpperCase());
    }
    if (!location.pathname.startsWith("/checkout")) navigate("/checkout");
  };

  return (
    <div
      style={{ backgroundColor: bg, color: fg }}
      className="
        w-full border-b border-white/10
        px-3 md:px-6 py-2 text-sm
        flex flex-col gap-2 md:flex-row md:items-center md:justify-between
      "
    >
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {promo.image && (
          <img
            src={promo.image}
            alt=""
            className="h-6 w-6 shrink-0 object-contain rounded"
          />
        )}
        <div className="truncate font-semibold">{promo.headline}</div>
        {promo.subheadline && (
          <div className="hidden md:block opacity-90">{promo.subheadline}</div>
        )}
        {hhmmss && (
          <div className="ml-0 md:ml-3 text-xs opacity-90 shrink-0">
            {t("promo.endsIn", { time: hhmmss })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {promo.code && (
          <button
            onClick={apply}
            className="
              px-3 py-1 rounded
              bg-white/10 hover:bg-white/20
              border border-white/20
              transition-colors
            "
            style={{ color: fg }}
            title={t("promo.applyTitle")}
          >
            {t("promo.applyCoupon", { code: String(promo.code).toUpperCase() })}
          </button>
        )}
        {promo.link_url && (
          <a
            href={promo.link_url}
            className="underline underline-offset-2 hover:opacity-90"
            style={{ color: fg }}
          >
            {t("promo.shopNow")}
          </a>
        )}
        <button
          onClick={() => setHidden(true)}
          className="px-2 py-1 rounded hover:bg-white/10"
          style={{ color: fg }}
          aria-label={t("promo.hide")}
        >
          {"\u00d7"}
        </button>
      </div>
    </div>
  );
}
