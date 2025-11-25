// src/components/FeatureStrip.jsx
import { Gem, Home, Globe, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FeatureStrip() {
  const { t } = useTranslation();
  const features = [
    {
      icon: <Gem className="w-6 h-6" aria-hidden="true" />,
      label: t("home.features.materials"),
    },
    {
      icon: <Home className="w-6 h-6" aria-hidden="true" />,
      label: t("home.features.germany"),
    },
    {
      icon: <Globe className="w-6 h-6" aria-hidden="true" />,
      label: t("home.features.stones"),
    },
    {
      icon: <RotateCw className="w-6 h-6" aria-hidden="true" />,
      label: t("home.features.return"),
    },
  ];

  return (
    <section className="bg-backnewswhite dark:bg-backnewsdark py-3">
      <div
        className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4
                      text-sm text-marbleblack dark:text-marblewhite text-center items-center"
      >
        {features.map((feat, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span>{feat.icon}</span>
            <span className="font-medium">{feat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
