// src/pages/AboutContactPage.jsx
import { useTranslation } from "react-i18next";
import { useState } from "react";
import ReactPlayer from "react-player";
import aboutUs from "../assets/aboutUs.jpg";
import ContactSection from "../components/ContactForm";
import TrustBadges from "../components/TrustBadges";
import { galleryItems } from "../data/aboutGallery";

// TODO: replace these with your real images / video URLs

export default function AboutContactPage() {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] = useState(null);

  return (
    <main className="bg-marblewhite dark:bg-marbleblack min-h-screen py-10">
      {/* HERO SECTION */}
      <div className="w-full mx-auto flex flex-col md:flex-col items-center gap-10 px-6 pb-16 max-w-6xl">
        <div className="w-full md:w-1/2">
          <img
            src={aboutUs}
            alt={t("about.imageAlt")}
            className="w-full h-[340px] md:h-[410px] rounded-3xl object-cover shadow-lg"
          />
        </div>

        <div className="w-full md:w-1/2 flex flex-col gap-5">
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

          <div className="bg-[#b3dad5] dark:bg-neutral-800 px-5 py-4 rounded-xl text-lg font-semibold text-marbleblack dark:text-white shadow mt-2">
            {t("about.vision")}
          </div>
        </div>
      </div>

      {/* GALLERY SECTION (above TrustBadges) */}
      <section className="px-6 max-w-6xl mx-auto pb-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-marbleblack dark:text-white">
          {t("about.galleryHeading", "Our craft in motion")}
        </h2>
        {galleryItems.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {t(
              "about.galleryEmpty",
              "Gallery coming soon – we’re preparing new photos and videos."
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {galleryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item)}
                className="relative group overflow-hidden rounded-2xl shadow-md bg-black/5 dark:bg-white/5 cursor-pointer"
              >
                <img
                  src={item.thumb || item.src}
                  alt={item.alt}
                  className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span>{item.title}</span>
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/60 text-white text-xl">
                      ▶
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* TRUST BADGES */}
      <div className="px-6 max-w-6xl mx-auto pb-6">
        <TrustBadges />
      </div>

      {/* CONTACT FORM */}
      <ContactSection />

      {/* LIGHTBOX OVERLAY */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="relative w-full max-w-4xl mx-4">
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute -top-10 right-0 md:-top-12 md:-right-2 text-white text-2xl font-bold px-2 py-1 rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>

            {activeItem.type === "video" ? (
              <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                <video
                  src={activeItem.src}
                  controls
                  className="w-full h-full"
                />
              </div>
            ) : (
              <img
                src={activeItem.src}
                alt={activeItem.alt}
                className="w-full max-h-[80vh] object-contain rounded-2xl bg-black"
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
