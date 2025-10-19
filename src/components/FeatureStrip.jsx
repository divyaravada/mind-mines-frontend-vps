// src/components/FeatureStrip.jsx
import { Gem, Home, Globe, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FeatureStrip() {
  const { t } = useTranslation();
  const features = [
    { icon: <Gem className="w-6 h-6" />, label: t("home.features.materials") },
    { icon: <Home className="w-6 h-6" />, label: t("home.features.germany") },
    { icon: <Globe className="w-6 h-6" />, label: t("home.features.stones") },
    {
      icon: <RotateCw className="w-6 h-6" />,
      label: t("home.features.return"),
    },
  ];

  return (
    <section className="bg-[#ec8b0b] dark:bg-[#578d49] py-3">
      <div className="max-w-10xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-marbleblack dark:text-gray-100 text-center items-center">
        {features.map((feat, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span>{feat.icon}</span>
            <span>{feat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
