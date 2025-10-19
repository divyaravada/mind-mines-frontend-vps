// src/components/AboutUsRow.jsx
import aboutUs from "../assets/aboutUs.jpg";
import { useTranslation } from "react-i18next";

export function AboutUsRow() {
  const { t } = useTranslation();
  return (
    <section className="py-16 bg-white scheme-light dark:scheme-dark dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-12 px-4">
        {/* Left: Image */}
        <figure className="relative w-full overflow-hidden rounded-2xl shadow aspect-[4/3]">
          <img
            src={aboutUs}
            alt={t("home.aboutUs.alt", "About Us")}
            className="absolute inset-0 w-full h-full object-contain md:object-cover transition-transform duration-300 md:hover:scale-110"
          />
        </figure>
        {/* Right: Text */}
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-4 text-backnewswhite dark:text-backnewsdark ">
            {t("home.aboutUs.heading")}
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed">
            {t("home.aboutUs.text")}
            <br />
            <br />
            {t("home.aboutUs.secText")}
          </p>
        </div>
      </div>
    </section>
  );
}
