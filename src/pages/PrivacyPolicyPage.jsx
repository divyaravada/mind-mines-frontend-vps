// src/pages/PrivacyPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

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

  return (
    <>
      <Helmet>
        <title>{t("legal.privacy.title")} | MindMines</title>
        <meta name="description" content={t("legal.privacy.intro")} />
      </Helmet>

      <div className="min-h-screen bg-marblewhite dark:bg-backnewsdark pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
          {/* Sidebar / TOC */}
          <aside className="lg:w-1/4 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 h-max sticky top-20 bg-white/70 dark:bg-neutral-900/80 backdrop-blur">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              {t("legal.privacy.title")}
            </h2>{" "}
            <p>
              <em>{t("legal.lastUpdated", { date: today })}</em>
            </p>
            <nav className="space-y-2 text-sm">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    const el = document.getElementById(section.id);
                    if (el)
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="block w-full text-left px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200"
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="lg:w-3/4 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200/70 dark:border-neutral-800 px-6 sm:px-8 py-8 space-y-8">
            <header className="border-b border-gray-200 dark:border-neutral-800 pb-5 mb-4">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-2">
                MindMines
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-backnewsdark dark:text-backnewswhite">
                {t("legal.privacy.title")}
              </h1>
            </header>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-3">
                <h2 className="text-lg md:text-xl font-semibold text-marbleblack dark:text-white">
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
