// src/pages/TermsPage.jsx
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

export default function TermsPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [tocOpen, setTocOpen] = useState(false);

  const [trackEvent] = useTrackEventMutation();

  // 🔹 Track page view
  useEffect(() => {
    try {
      trackEvent({
        event_type: "page_view_terms",
        path: "/terms", // change if your actual route is different
      });
    } catch {
      /* ignore tracking errors */
    }
  }, [trackEvent]);

  const sections = [
    {
      id: "overview",
      title: t("legal.terms.title"),
      text: [
        t("legal.terms.overview"),
        t("legal.terms.acceptance"),
        t("legal.terms.updates"),
      ],
    },
    {
      id: "section1",
      title: t("legal.terms.section1_title"),
      text: [t("legal.terms.section1_text")],
    },
    {
      id: "section2",
      title: t("legal.terms.section2_title"),
      text: [t("legal.terms.section2_text")],
    },
    {
      id: "section3",
      title: t("legal.terms.section3_title"),
      text: [t("legal.terms.section3_text")],
    },
    {
      id: "section4",
      title: t("legal.terms.section4_title"),
      text: [t("legal.terms.section4_text")],
    },
    {
      id: "section5",
      title: t("legal.terms.section5_title"),
      text: [t("legal.terms.section5_text")],
    },
    {
      id: "section6",
      title: t("legal.terms.section6_title"),
      text: [t("legal.terms.section6_text")],
    },
    {
      id: "section7",
      title: t("legal.terms.section7_title"),
      text: [t("legal.terms.section7_text")],
    },
    {
      id: "section8",
      title: t("legal.terms.section8_title"),
      text: [t("legal.terms.section8_text")],
    },
    {
      id: "section9",
      title: t("legal.terms.section9_title"),
      text: [t("legal.terms.section9_text")],
    },
    {
      id: "section10",
      title: t("legal.terms.section10_title"),
      text: [t("legal.terms.section10_text")],
    },
    {
      id: "section11",
      title: t("legal.terms.section11_title"),
      text: [t("legal.terms.section11_text")],
    },
    {
      id: "section12",
      title: t("legal.terms.section12_title"),
      text: [t("legal.terms.section12_text")],
    },
    {
      id: "section13",
      title: t("legal.terms.section13_title"),
      text: [t("legal.terms.section13_text")],
    },
    {
      id: "section14",
      title: t("legal.terms.section14_title"),
      text: [t("legal.terms.section14_text")],
    },
    {
      id: "section15",
      title: t("legal.terms.section15_title"),
      text: [t("legal.terms.section15_text")],
    },
    {
      id: "section16",
      title: t("legal.terms.section16_title"),
      text: [t("legal.terms.section16_text")],
    },
    {
      id: "section17",
      title: t("legal.terms.section17_title"),
      text: [t("legal.terms.section17_text")],
    },
    {
      id: "section18",
      title: t("legal.terms.section18_title"),
      text: [t("legal.terms.section18_text")],
    },
    {
      id: "section19",
      title: t("legal.terms.section19_title"),
      text: [t("legal.terms.section19_text")],
    },
    {
      id: "section20",
      title: t("legal.terms.section20_title"),
      text: [t("legal.terms.section20_text")],
    },
  ];

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Close the TOC on mobile after clicking
      setTocOpen(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("legal.terms.title")} | MindMines</title>
        <meta name="description" content={t("legal.terms.overview")} />
      </Helmet>

      <div className="min-h-screen bg-marblewhite dark:bg-backnewsdark pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Left: table of contents */}
          <aside className="w-full lg:w-1/4">
            {/* Mobile TOC header */}
            <div className="border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 bg-white/80 dark:bg-neutral-900/90 backdrop-blur lg:sticky lg:top-20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    {t("legal.terms.title")}
                  </h2>
                </div>

                {/* Toggle button only on mobile/tablet */}
                <button
                  type="button"
                  onClick={() => setTocOpen((prev) => !prev)}
                  className="lg:hidden inline-flex items-center gap-1 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-100 bg-gray-50 dark:bg-neutral-800"
                >
                  <span>
                    {tocOpen
                      ? t("legal.hideToc") ?? "Hide sections"
                      : t("legal.showToc") ?? "Show sections"}
                  </span>
                  <span
                    className={`transition-transform ${
                      tocOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
              </div>

              {/* TOC list: always visible on lg, collapsible on small */}
              <nav
                className={`mt-4 space-y-1 text-xs sm:text-sm ${
                  tocOpen ? "block" : "hidden lg:block"
                }`}
              >
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleScrollTo(section.id)}
                    className="block w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right: content */}
          <main className="lg:w-3/4 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200/70 dark:border-neutral-800 px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
            <header className="border-b border-gray-200 dark:border-neutral-800 pb-4 sm:pb-5 mb-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">
                MindMines
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-backnewsdark dark:text-backnewswhite">
                {t("legal.terms.title")}
              </h1>
              <p className="text-xs text-gray-500 py-2 dark:text-gray-400">
                <em>{t("legal.lastUpdated", { date: today })}</em>
              </p>
            </header>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="space-y-2 sm:space-y-3"
              >
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-marbleblack dark:text-white">
                  {section.title}
                </h2>
                {section.text.map((para, idx) => (
                  <p
                    key={idx}
                    className="text-xs sm:text-sm md:text-base leading-relaxed text-gray-700 dark:text-gray-200"
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
