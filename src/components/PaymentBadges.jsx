// src/components/PaymentBadges.jsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function PaymentBadges() {
  const { t } = useTranslation();
  return (
    <section className="py-6 bg-[#f8fcfe] dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold">{t("home.trust.secure")}</span>
        <div className="h-5 w-px bg-gray-300 dark:bg-gray-700" />
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold">PayPal</span>
          <span>•</span>
          <span className="font-semibold">Visa</span>
          <span>•</span>
          <span className="font-semibold">SEPA</span>
          <span>•</span>
          <span className="font-semibold">Stripe</span>
        </div>
      </div>
    </section>
  );
}
