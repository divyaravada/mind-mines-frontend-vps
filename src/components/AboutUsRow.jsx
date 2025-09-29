import aboutUs from "../assets/aboutUs.jpg";
import { useTranslation } from "react-i18next";

export function AboutUsRow() {
  const { t } = useTranslation();
  return (
    <section className="py-16 bg-white  scheme-light dark:scheme-dark dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 px-4">
        {/* Left: Image */}
        <img
          src={aboutUs}
          alt="About Us"
          className="max-w-5xl md:w-1/2 sm:w-1/2 max-h-fill rounded-2xl object-cover shadow transition-transform duration-300 hover:scale-110"
        />
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
