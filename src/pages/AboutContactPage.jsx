// src/pages/AboutContactPage.jsx
import { useTranslation } from "react-i18next";
import { useState } from "react";
import aboutUs from "../assets/aboutUs.jpg";
import ContactSection from "../components/ContactForm";
import TrustBadges from "../components/TrustBadges";
import marbleCrafting from "../assets/MindminesVideo.mp4";
import marbleSculpting from "../assets/MindminesAbout.jpg";

// TODO: replace these with your real images / video URLs

export default function AboutContactPage() {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] = useState(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const VIDEO_SRC = marbleCrafting;
  const VIDEO_POSTER = marbleSculpting;

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

        {/* Text content */}
        <div className="w-full md:w-1/2 flex flex-col gap-5">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-backnewswhite dark:text-backnewsdark">
            {t("about.storyTitle")}
          </h1>

          <div className="space-y-4 text-lg leading-relaxed text-gray-700 dark:text-gray-200">
            <p>{t("about.storyParagraph1")}</p>
            <p>{t("about.storyParagraph2")}</p>
            <p>{t("about.storyParagraph3")}</p>
            <p>{t("about.storyParagraph4")}</p>
          </div>

          <div className="bg-[#b3dad5] dark:bg-neutral-800 px-5 py-4 rounded-xl text-lg font-semibold text-marbleblack dark:text-white shadow mt-2">
            {t("about.storyParagraph5")}
          </div>
        </div>
      </div>

      {/* VIDEO SECTION (above TrustBadges) */}
      <section className="w-full mx-auto flex flex-col md:flex-col items-center gap-4 px-6 pb-16 max-w-6xl">
        <h2 className="text-3xl font-extrabold  text-backnewswhite dark:text-backnewsdark">
          {t("about.galleryHeading")}
        </h2>

        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {t("about.galleryIntro")}
        </p>

        {/* Video teaser card */}
        <button
          type="button"
          onClick={() => setIsVideoOpen(true)}
          className="relative w-full aspect-video max-w-3xl mx-auto overflow-hidden rounded-2xl shadow-md bg-black/5 dark:bg-white/5 group"
        >
          <img
            src={VIDEO_POSTER}
            alt={t("about.videoAlt")}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

          {/* Play button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="mt-3 text-sm md:text-base font-medium">
              {t("about.videoCta")}
            </span>
          </div>
        </button>

        {/* Modal / Lightbox with big video */}
        {isVideoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            {/* close area */}
            <button
              type="button"
              className="absolute inset-0 w-full h-full cursor-default"
              onClick={() => setIsVideoOpen(false)}
              aria-label={t("about.closeVideo")}
            />

            <div className="relative w-full max-w-4xl mx-auto px-4">
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsVideoOpen(false)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white text-2xl"
                aria-label={t("common.close")}
              >
                ✕
              </button>

              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
                <video
                  src={VIDEO_SRC}
                  controls
                  autoPlay
                  loop
                  poster={VIDEO_POSTER}
                  className="w-full h-full max-h-[80vh] object-contain"
                />
              </div>
            </div>
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
              aria-label={t("common.close")}
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
