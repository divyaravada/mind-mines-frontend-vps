// src/components/TrustBadges.jsx
import React from "react";
import { useTranslation } from "react-i18next";

const Tag = ({ children }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-marblewhite dark:bg-marbleblack/60 shadow-sm border border-gray-200/70 dark:border-gray-700/60">
    {children}
  </div>
);

const Logo = ({ label }) => (
  <span className="text-sm font-semibold tracking-wide text-backnewswhite dark:text-backnewsdark">
    {label}
  </span>
);

export default function TrustBadges() {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("badges.ariaLabel")}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <Tag>
        <div className="flex gap-3 items-center">
          <Logo label="PayPal" />
          <span className="opacity-50">•</span>
          <Logo label="Visa" />
          <span className="opacity-50">•</span>
          <Logo label="SEPA" />
        </div>
        <span className="ml-auto text-xs text-gray-600 dark:text-gray-300">
          {t("badges.payments")}
        </span>
      </Tag>

      <Tag>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="opacity-80 text-backnewswhite dark:text-backnewsdark"
          aria-hidden="true"
        >
          <path
            d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z"
            fill="currentColor"
          />
        </svg>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {t("badges.security")}
        </span>
        <span className="ml-auto text-xs text-gray-600 dark:text-gray-300">
          {t("badges.ssl")}
        </span>
      </Tag>

      <Tag>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="opacity-80 text-backnewswhite dark:text-backnewsdark"
          aria-hidden="true"
        >
          <path
            d="M12 2l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 3-5z"
            fill="currentColor"
          />
        </svg>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {t("badges.guarantee")}
        </span>
        <span className="ml-auto text-xs text-gray-600 dark:text-gray-300">
          {t("badges.shipsTo")}
        </span>
      </Tag>
    </section>
  );
}
