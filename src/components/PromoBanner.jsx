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
  // âœ… All hooks are top-level and unconditional
  const [promo, setPromo] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const tickRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await http.get("promotions/active/");
        if (r.data?.active) {
          setPromo(r.data);
          setRemaining(r.data.remaining_seconds ?? null);
        } else {
          setPromo(null);
        }
      } catch {
        setPromo(null);
      }
    })();
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

  // âœ… Itâ€™s fine to early-return here because there are NO hooks below this line
  if (!show) return null;

  const bg = promo.bg_color || "#111827";
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
      className="w-full border-b px-3 md:px-6 py-2 text-sm flex items-center gap-3 justify-between"
    >
      <div className="flex items-center gap-3">
        {promo.image && (
          <img
            src={promo.image}
            alt=""
            className="h-6 w-6 object-contain rounded"
          />
        )}
        <div className="font-semibold">{promo.headline}</div>
        {promo.subheadline && (
          <div className="opacity-90">{promo.subheadline}</div>
        )}
        {hhmmss && (
          <div className="ml-3 text-xs opacity-90">{t("promo.endsIn", { time: hhmmss })}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {promo.code && (
          <button
            onClick={apply}
            className="px-3 py-1 rounded bg-white/10 hover:bg_white/20 border border-white/20"
            style={{ color: fg }}
            title={t("promo.applyTitle")}
          >
            {t("promo.applyCoupon", { code: String(promo.code).toUpperCase() })}
          </button>
        )}
        {promo.link_url && (
          <a href={promo.link_url} className="underline" style={{ color: fg }}>
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

