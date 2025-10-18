// src/components/HandmadeGuarantee.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck } from "lucide-react";

export default function HandmadeGuarantee() {
  const { t } = useTranslation();
  return (
    <section className="py-8 bg-[#b3dad5] dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
        <BadgeCheck className="w-6 h-6" />
        <div>
          <h3 className="text-lg md:text-xl font-bold">
            {t("home.handmade.title")}
          </h3>
          <p className="text-sm md:text-base opacity-90">
            {t("home.handmade.text")}
          </p>
        </div>
      </div>
    </section>
  );
}
