// src/components/FreeDelivery.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Truck } from "lucide-react";

export default function FreeDelivery({ deAmount = 49, euAmount = 99 }) {
  const { t } = useTranslation();
  return (
    <section className="py-10 bg-marblewhite dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-xl md:text-2xl font-bold mb-3 text-backnewswhite dark:text-backnewsdark">
          {t("home.shipping.title")}
        </h3>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 p-6 flex items-start gap-4">
          <Truck className="w-6 h-6 mt-0.5 text-backnewswhite dark:text-backnewsdark" />
          <div className="space-y-1 text-gray-800 dark:text-gray-100">
            <p>{t("home.shipping.de", { amount: deAmount })}</p>
            <p>{t("home.shipping.eu", { amount: euAmount })}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("home.shipping.note")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
