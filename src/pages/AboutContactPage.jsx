// src/pages/AboutContactPage.jsx
import { useTranslation } from "react-i18next";
import aboutUs from "../assets/aboutUs.jpg";
import ContactSection from "../components/ContactForm";
import TrustBadges from "../components/TrustBadges";

export default function AboutContactPage() {
  const { t } = useTranslation();

  return (
    <main className="bg-[#f8fcfe] dark:bg-marbleblack min-h-screen py-10">
      {/* About Us */}
      <div className="w-full mx-auto flex flex-col md:flex-col items-center gap-10 px-6 pb-16">
        <div className="md:w-1/2">
          <img
            src={aboutUs}
            alt={t("about.imageAlt")}
            className="w-full h-[340px] md:h-[410px] rounded-3xl object-cover shadow-lg"
          />
        </div>
        <div className="md:w-1/2 flex flex-col gap-5">
          <h1 className="text-4xl font-extrabold mb-2 text-backnewswhite dark:text-backnewsdark">
            {t("about.heading")}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-200">
            {t("about.intro")}
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-200">
            {t("about.founded")}
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-200">
            {t("about.today")}
          </p>

          <div className="bg-[#b3dad5] dark:bg-gray-800 px-5 py-4 rounded-xl text-lg font-semibold text-marbleblack dark:text-white shadow mt-2">
            {t("about.vision")}
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="px-6 max-w-6xl mx-auto pb-6">
        <TrustBadges />
      </div>

      {/* Contact Us */}
      <ContactSection />
    </main>
  );
}
