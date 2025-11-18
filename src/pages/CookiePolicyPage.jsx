// src/pages/CookiePolicyPage.jsx
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useState } from "react";

export default function CookiePolicyPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const sections = [
    {
      id: "intro",
      title: t("legal.cookies.title"),
      text: [t("legal.cookies.intro")],
    },
    {
      id: "section1",
      title: t("legal.cookies.section1_title"),
      text: [t("legal.cookies.section1_text")],
    },
    {
      id: "section2",
      title: t("legal.cookies.section2_title"),
      text: [t("legal.cookies.section2_text")],
    },
    {
      id: "section3",
      title: t("legal.cookies.section3_title"),
      text: [t("legal.cookies.section3_text")],
    },
    {
      id: "section4",
      title: t("legal.cookies.section4_title"),
      text: [t("legal.cookies.section4_text")],
    },
    {
      id: "section5",
      title: t("legal.cookies.section5_title"),
      text: [t("legal.cookies.section5_text")],
    },
    {
      id: "section6",
      title: t("legal.cookies.section6_title"),
      text: [t("legal.cookies.section6_text")],
    },
    {
      id: "section7",
      title: t("legal.cookies.section7_title"),
      text: [t("legal.cookies.section7_text")],
    },
    {
      id: "section8",
      title: t("legal.cookies.section8_title"),
      text: [t("legal.cookies.section8_text")],
    },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("legal.cookies.title")} | MindMines</title>
        <meta name="description" content={t("legal.cookies.intro")} />
      </Helmet>

      <div className="min-h-screen bg-marblewhite dark:bg-backnewsdark pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:w-1/4 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 h-max sticky top-20 bg-white/70 dark:bg-neutral-900/80 backdrop-blur">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              {t("legal.cookies.title")}
            </h2>{" "}
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

          <main className="lg:w-3/4 w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200/70 dark:border-neutral-800 px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
            <header className="border-b border-gray-200 dark:border-neutral-800 pb-5 mb-4">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-2">
                MindMines
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-backnewsdark dark:text-backnewswhite">
                {t("legal.cookies.title")}
              </h1>{" "}
              <p className="text-xs text-gray-500 py-2 dark:text-gray-400">
                <em>{t("legal.lastUpdated", { date: today })}</em>
              </p>
            </header>

            {/* Mobile TOC button */}
            <div className="lg:hidden mb-4">
              <button
                type="button"
                onClick={() => setMobileTocOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900 text-gray-800 dark:text-gray-100"
              >
                <span>{t("legal.cookies.title")}</span>
                <span className="text-xs uppercase tracking-wide">
                  {mobileTocOpen ? "Close" : "Sections"}
                </span>
              </button>

              {mobileTocOpen && (
                <nav className="mt-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm divide-y divide-gray-100 dark:divide-neutral-800">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setMobileTocOpen(false);
                        scrollToSection(section.id);
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
