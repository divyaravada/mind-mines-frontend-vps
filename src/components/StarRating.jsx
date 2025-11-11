// src/components/StarRating.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";

export default function StarRating({
  value,
  onChange,
  size = 28,
  disabled = false,
  className = "",
  ariaLabel = "Rating",
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? value;
  const groupLabel = ariaLabel || t("rating.defaultLabel");

  const handleKey = (e) => {
    if (disabled) return;
    const v = Number(value || 0);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(Math.min(5, v + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(Math.max(1, v - 1));
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      onChange(Number(e.key));
    } else if (e.key.toLowerCase() === "home") {
      e.preventDefault();
      onChange(1);
    } else if (e.key.toLowerCase() === "end") {
      e.preventDefault();
      onChange(5);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={groupLabel}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKey}
      className={`inline-flex items-center gap-1 ${
        disabled ? "opacity-60" : ""
      } ${className}`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= display;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${
              n === 1 ? t("rating.starSingular") : t("rating.starPlural")
            }`}
            disabled={disabled}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(null)}
            onClick={() => !disabled && onChange(n)}
            className={`
              p-1 rounded-md transition-transform outline-none
              ${
                disabled
                  ? "cursor-not-allowed"
                  : "cursor-pointer hover:scale-105"
              }
              focus-visible:ring-2 focus-visible:ring-backnewswhite dark:focus-visible:ring-backnewsdark
            `}
            style={{ lineHeight: 0 }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={
                active
                  ? "text-yellow-400"
                  : "text-gray-300 dark:text-neutral-600"
              }
              fill="currentColor"
            >
              <path d="M12 2.25l2.953 5.98 6.6.96-4.776 4.654 1.128 6.582L12 17.77l-5.905 3.156 1.128-6.582L2.447 9.19l6.6-.96L12 2.25z" />
            </svg>
          </button>
        );
      })}
      <span className="ml-2 text-sm text-gray-600 dark:text-neutral-300">
        {t("rating.value", { value })}
      </span>
    </div>
  );
}

StarRating.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  size: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};
