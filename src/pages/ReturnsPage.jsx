// src/pages/ReturnsPage.jsx
import { useTranslation } from "react-i18next";
import SEO from "../components/SEO";
import { useState, useEffect } from "react";
import { useTrackEventMutation } from "../features/marketing/marketingApi";
import { isPrerender } from "../utils/isPrerender";

export default function ReturnsPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    if (isPrerender) return;
    try {
      trackEvent({
        event_type: "page_view_returns_policy",
        path: "/returns", // or "/return-policy" etc. based on your route
      });
    } catch {}
  }, [isPrerender, trackEvent]);

  const sections = [
    {
      id: "intro",
      title: t("legal.returns.title"),
      text: [t("legal.returns.intro")],
    },
    {
      id: "section1",
      title: t("legal.returns.section1_title"),
      text: [t("legal.returns.section1_text")],
    },
    {
      id: "section2",
      title: t("legal.returns.section2_title"),
      text: [t("legal.returns.section2_text")],
    },
    {
      id: "section3",
      title: t("legal.returns.section3_title"),
      text: [t("legal.returns.section3_text")],
    },
    {
      id: "section4",
      title: t("legal.returns.section4_title"),
      text: [t("legal.returns.section4_text")],
    },
    {
      id: "section5",
      title: t("legal.returns.section5_title"),
      text: [t("legal.returns.section5_text")],
    },
    {
      id: "section6",
      title: t("legal.returns.section6_title"),
      text: [t("legal.returns.section6_text")],
    },
    {
      id: "section7",
      title: t("legal.returns.section7_title"),
      text: [t("legal.returns.section7_text")],
    },
    {
      id: "section8",
      title: t("legal.returns.section8_title"),
      text: [t("legal.returns.section8_text")],
    },
    {
      id: "section9",
      title: t("legal.returns.section9_title"),
      text: [t("legal.returns.section9_text")],
    },
  ];

  const handleScrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Close mobile TOC after navigating
    setMobileTocOpen(false);
  };

  const title = `${t("legal.returns.title")} | MindMines`;
  const description = t("legal.returns.intro");
  const canonical = "https://mindmines.eu/returns";

  return (
    <>
      <SEO title={title} description={description} canonical={canonical} />

      <div className="min-h-screen bg-marblewhite dark:bg-backnewsdark pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Mobile TOC */}
          <div className="lg:hidden mb-2">
            <button
              type="button"
              onClick={() => setMobileTocOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm"
            >
              <span>{t("legal.returns.title")}</span>
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {mobileTocOpen
                  ? t("legal.close") || "Close"
                  : t("legal.open") || "Contents"}
              </span>
            </button>

            {mobileTocOpen && (
              <nav className="mt-2 space-y-1 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-sm max-h-72 overflow-y-auto">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleScrollToSection(section.id)}
                    className="block w-full text-left px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:w-1/4 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 h-max sticky top-24 bg-white/70 dark:bg-neutral-900/80 backdrop-blur">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              {t("legal.returns.title")}
            </h2>
            <nav className="space-y-2 text-sm">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleScrollToSection(section.id)}
                  className="block w-full text-left px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200"
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="lg:w-3/4 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200/70 dark:border-neutral-800 px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
            <header className="border-b border-gray-200 dark:border-neutral-800 pb-4 sm:pb-5 mb-4">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-2">
                MindMines
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-backnewsdark dark:text-backnewswhite">
                {t("legal.returns.title")}
              </h1>
              <p className="text-xs text-gray-500 py-2 dark:text-gray-400">
                <em>{t("legal.lastUpdated", { date: today })}</em>
              </p>
            </header>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-3">
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
