//src/components/TrustBadges.jsx
import React from "react";
import { useTranslation } from "react-i18next";

const Tag = ({ children }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 shadow border border-gray-100 dark:border-gray-700">
    {children}
  </div>
);

const Logo = ({ label }) => (
  <span className="text-sm font-semibold tracking-wide">{label}</span>
);

export default function TrustBadges() {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("badges.ariaLabel")}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <Tag>
        {/* Payments: PayPal, Klarna, Visa, SEPA */}
        <div className="flex gap-3 items-center">
          <Logo label="PayPal" />
          <span>•</span>
          <Logo label="Visa" />
          <span>•</span>
          <Logo label="SEPA" />
        </div>
        <span className="ml-auto text-xs opacity-75">
          {t("badges.payments")}
        </span>
      </Tag>

      <Tag>
        {/* SSL */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="opacity-80"
          aria-hidden="true"
        >
          <path
            d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z"
            fill="currentColor"
          />
        </svg>
        <span className="font-semibold">{t("badges.security")}</span>
        <span className="ml-auto text-xs opacity-75">{t("badges.ssl")}</span>
      </Tag>

      <Tag>
        {/* 14-day guarantee */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="opacity-80"
          aria-hidden="true"
        >
          <path
            d="M12 2l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 3-5z"
            fill="currentColor"
          />
        </svg>
        <span className="font-semibold">{t("badges.guarantee")}</span>
        <span className="ml-auto text-xs opacity-75">
          {t("badges.shipsTo")}
        </span>
      </Tag>
    </section>
  );
}
