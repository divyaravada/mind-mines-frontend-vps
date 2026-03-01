// src/pages/PrivacyPage.jsx
import React, { useState, useEffect } from "react";
import { useTrackEventMutation } from "../features/marketing/marketingApi";
import { useTranslation } from "react-i18next";
import SEO from "../components/SEO";
import { isPrerender } from "../utils/isPrerender";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [mobileSection, setMobileSection] = useState("intro");
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    if (isPrerender) return;
    try {
      trackEvent({
        event_type: "page_view_privacy",
        path: "/privacy-policy", // adjust to your real path
      });
    } catch {}
  }, [isPrerender, trackEvent]);

  const sections = [
    {
      id: "intro",
      title: t("legal.privacy.title"),
      text: [t("legal.privacy.intro"), t("legal.privacy.updateNotice")],
    },
    {
      id: "section1",
      title: t("legal.privacy.section1_title"),
      text: [t("legal.privacy.section1_text")],
    },
    {
      id: "section2",
      title: t("legal.privacy.section2_title"),
      text: [t("legal.privacy.section2_text")],
    },
    {
      id: "section3",
      title: t("legal.privacy.section3_title"),
      text: [
        t("legal.privacy.section3_text_a"),
        t("legal.privacy.section3_text_b"),
        t("legal.privacy.section3_text_c"),
      ],
    },
    {
      id: "section4",
      title: t("legal.privacy.section4_title"),
      text: [t("legal.privacy.section4_text")],
    },
    {
      id: "section5",
      title: t("legal.privacy.section5_title"),
      text: [t("legal.privacy.section5_text")],
    },
    {
      id: "section6",
      title: t("legal.privacy.section6_title"),
      text: [t("legal.privacy.section6_text")],
    },
    {
      id: "section7",
      title: t("legal.privacy.section7_title"),
      text: [t("legal.privacy.section7_text")],
    },
    {
      id: "section8",
      title: t("legal.privacy.section8_title"),
      text: [
        t("legal.privacy.section8_text"),
        t("legal.privacy.section8_contact"),
      ],
    },
    {
      id: "section9",
      title: t("legal.privacy.section9_title"),
      text: [t("legal.privacy.section9_text")],
    },
    {
      id: "section10",
      title: t("legal.privacy.section10_title"),
      text: [t("legal.privacy.section10_text")],
    },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleMobileChange = (e) => {
    const value = e.target.value;
    setMobileSection(value);
    scrollToSection(value);
  };

  return (
    <>
      <SEO
        title={`${t("legal.privacy.title")} | MindMines`}
        description={t("legal.privacy.intro")}
        canonical="https://mindmines.eu/privacy"
      />

      <div className="min-h-screen bg-marblewhite dark:bg-backnewsdark pt-6 pb-14 px-4 sm:px-5 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Sidebar / TOC - Desktop & Large Screens */}
          <aside className="hidden lg:block lg:w-1/4 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 h-max sticky top-20 bg-white/70 dark:bg-neutral-900/80 backdrop-blur">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              {t("legal.privacy.title")}
            </h2>

            <nav className="space-y-2 text-sm">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="block w-full text-left px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200"
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="lg:w-3/4 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200/70 dark:border-neutral-800 px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-8">
            <header className="border-b border-gray-200 dark:border-neutral-800 pb-5 mb-4">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-1">
                MindMines
              </p>
              <h1 className="text-2xl md:text-4xl font-extrabold text-backnewsdark dark:text-backnewswhite">
                {t("legal.privacy.title")}
              </h1>
              <p className="text-xs text-gray-500 py-2 dark:text-gray-400 mb-3">
                <em>{t("legal.lastUpdated", { date: today })}</em>
              </p>

              {/* Mobile "Jump to section" selector */}
              <div className="mt-4 lg:hidden">
                <label
                  htmlFor="privacy-mobile-nav"
                  className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                >
                  {t("legal.jumpToSection") || "Jump to section"}
                </label>
                <select
                  id="privacy-mobile-nav"
                  value={mobileSection}
                  onChange={handleMobileChange}
                  className="w-full rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm px-3 py-2 text-gray-800 dark:text-gray-100"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>
            </header>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-3">
                <h2 className="text-base md:text-xl font-semibold text-marbleblack dark:text-white">
                  {section.title}
                </h2>
                {section.text.map((para, idx) => (
                  <p
                    key={idx}
                    className="text-sm md:text-base leading-relaxed text-gray-700 dark:text-gray-200"
                  >
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </main>
        </div>
      </div>
    </>
  );
}
