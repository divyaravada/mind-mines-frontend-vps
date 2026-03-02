// src/components/AboutUsRow.jsx
import aboutUs from "../assets/aboutUs.jpg";
import { useTranslation } from "react-i18next";

export function AboutUsRow() {
  const { t } = useTranslation();
  return (
    <section className="py-16 bg-marblewhite dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-10 px-4">
        {/* Left: Image */}
        <figure className="relative w-full overflow-hidden rounded-2xl shadow border border-black/5 dark:border-white/10 aspect-[4/3]">
          <img
            src={aboutUs}
            alt={t("home.aboutUs.alt", "About Us")}
            className="absolute inset-0 w-full h-full object-contain md:object-cover transition-transform duration-300 md:hover:scale-105"
            loading="eager"
            fetchPriority="high"
          />
        </figure>

        {/* Right: Text */}
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-backnewswhite dark:text-backnewsdark">
            {t("home.aboutUs.heading")}
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-backnewswhite dark:text-backnewsdark">
            {t("home.aboutUs.subheading")}
          </h2>
          <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-200">
            {t("home.aboutUs.text")}
            <br />
            {t("home.aboutUs.text2")}
            <br />
            {t("home.aboutUs.secText")}
          </p>
        </div>
      </div>
    </section>
  );
}
