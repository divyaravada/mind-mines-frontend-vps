// src/pages/ImprintPage.jsx
import { useTranslation } from "react-i18next";
import SEO from "../components/SEO";
import { useState, useEffect } from "react";
import { useTrackEventMutation } from "../features/marketing/marketingApi";
import { isPrerender } from "../utils/isPrerender";

export default function ImprintPage() {
  const { t } = useTranslation();

  const title = `${t("legal.imprint.title")} | MindMines`;
  const description = t(
    "legal.imprint.meta_description",
    "Legal notice and company information for MindMines GbR.",
  );
  const canonical = "https://mindmines.eu/imprint";
  const today = new Date().toISOString().slice(0, 10);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    if (isPrerender) return;
    try {
      trackEvent({
        event_type: "page_view_imprint",
        path: "/imprint", // e.g. /impressum if you use German route
      });
    } catch {}
  }, [isPrerender, trackEvent]);

  const sections = [
    {
      id: "section1",
      title: t("legal.imprint.section1_title"),
      text: [
        t("legal.imprint.section1_text_a"),
        t("legal.imprint.section1_text_b"),
        t("legal.imprint.section1_text_c"),
        t("legal.imprint.section1_text_d"),
      ],
    },
    {
      id: "section2",
      title: t("legal.imprint.section2_title"),
      text: [t("legal.imprint.section2_text")],
    },
    {
      id: "section3",
      title: t("legal.imprint.section3_title"),
      text: [t("legal.imprint.section3_text")],
    },
    {
      id: "section4",
      title: t("legal.imprint.section4_title"),
      text: [t("legal.imprint.section4_text")],
    },
    {
      id: "section5",
      title: t("legal.imprint.section5_title"),
      text: [t("legal.imprint.section5_text")],
    },
    {
      id: "section6",
      title: t("legal.imprint.section6_title"),
      text: [t("legal.imprint.section6_text")],
    },
    {
      id: "section7",
      title: t("legal.imprint.section7_title"),
      text: [t("legal.imprint.section7_text")],
    },
  ];

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <SEO title={title} description={description} canonical={canonical} />

      <div className="min-h-screen bg-marblewhite dark:bg-backnewsdark pt-6 sm:pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Desktop TOC */}
          <aside className="hidden lg:block lg:w-1/4 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 h-max sticky top-20 bg-white/70 dark:bg-neutral-900/80 backdrop-blur">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              {t("legal.imprint.title")}
            </h2>
            <nav className="space-y-2 text-sm">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleScrollTo(section.id)}
                  className="block w-full text-left px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200"
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="lg:w-3/4 w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200/70 dark:border-neutral-800 px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
            <header className="border-b border-gray-200 dark:border-neutral-800 pb-4 sm:pb-5 mb-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-2">
                MindMines
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-backnewsdark dark:text-backnewswhite">
                {t("legal.imprint.title")}
              </h1>{" "}
              <p className="text-xs text-gray-500 py-2 dark:text-gray-400">
                <em>{t("legal.lastUpdated", { date: today })}</em>
              </p>
            </header>

            {/* Mobile TOC */}
            <div className="lg:hidden mb-4">
              <button
                type="button"
                onClick={() => setMobileTocOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-neutral-800"
              >
                <span>{t("legal.imprint.title")}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {mobileTocOpen ? "– Close sections" : "+ Jump to section"}
                </span>
              </button>

              {mobileTocOpen && (
                <nav className="mt-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 divide-y divide-gray-100 dark:divide-neutral-800">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        handleScrollTo(section.id);
                        setMobileTocOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              )}
            </div>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="space-y-3 whitespace-pre-line scroll-mt-24"
              >
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-marbleblack dark:text-white">
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
