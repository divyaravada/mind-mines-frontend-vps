// src/components/HomeTrustSection.jsx
import React from "react";
import {
  ShieldCheck,
  MapPin,
  Truck,
  PackageCheck,
  Gem,
  CreditCard,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Item = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
    <Icon className="w-5 h-5" />
    <span className="text-sm md:text-base">{text}</span>
  </div>
);

export default function HomeTrustSection() {
  const { t } = useTranslation();
  return (
    <section className="py-12 bg-[#f8fcfe] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          {t("home.trust.title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Item icon={ShieldCheck} text={t("home.trust.secure")} />
          <Item icon={MapPin} text={t("home.trust.based")} />
          <Item icon={Truck} text={t("home.trust.dhl")} />
          <Item icon={PackageCheck} text={t("home.trust.packaging")} />
          <Item icon={Gem} text={t("home.trust.handmade")} />
          <Item icon={CreditCard} text={t("home.trust.badgePayments")} />
        </div>
      </div>
    </section>
  );
}
