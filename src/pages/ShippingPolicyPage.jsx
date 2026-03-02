// src/pages/ShippingPolicyPage.jsx
import { useTranslation } from "react-i18next";
import SEO from "../components/SEO";
import { useState, useEffect } from "react";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

export default function ShippingPolicyPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [isMobileTOCOpen, setIsMobileTOCOpen] = useState(false);
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    if (process.env.REACT_SNAP === "1") return; // ✅ don't run during snapshot
    (async () => {
      try {
        trackEvent({
          event_type: "page_view_shipping_policy",
          path: "/shipping",
        });
      } catch {}
    })();
  }, [trackEvent]);

  const title = `${t("legal.shipping.title")} | MindMines`;
  const description = t("legal.shipping.intro");
  const canonical = "https://mindmines.eu/shipping";

  const sections = [
    {
      id: "intro",
      title: t("legal.shipping.title"),
      text: [t("legal.shipping.intro")],
    },
    {
      id: "section1",
      title: t("legal.shipping.section1_title"),
      text: [t("legal.shipping.section1_text")],
    },
    {
      id: "section2",
      title: t("legal.shipping.section2_title"),
      text: [t("legal.shipping.section2_text")],
    },
    {
      id: "section3",
      title: t("legal.shipping.section3_title"),
      text: [t("legal.shipping.section3_text")],
    },
    {
      id: "section4",
      title: t("legal.shipping.section4_title"),
      text: [t("legal.shipping.section4_text")],
    },
    {
      id: "section5",
      title: t("legal.shipping.section5_title"),
      text: [t("legal.shipping.section5_text")],
    },
    {
      id: "section6",
      title: t("legal.shipping.section6_title"),
      text: [t("legal.shipping.section6_text")],
    },
    {
      id: "section7",
      title: t("legal.shipping.section7_title"),
      text: [t("legal.shipping.section7_text")],
    },
    {
      id: "section8",
      title: t("legal.shipping.section8_title"),
      text: [t("legal.shipping.section8_text")],
    },
    {
      id: "section9",
      title: t("legal.shipping.section9_title"),
      text: [t("legal.shipping.section9_text")],
    },
    {
      id: "section10",
      title: t("legal.shipping.section10_title"),
      text: [t("legal.shipping.section10_text")],
    },
  ];

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // close mobile TOC after clicking
    setIsMobileTOCOpen(false);
  };

  return (
    <>
      <SEO title={title} description={description} canonical={canonical} />

      <div className="min-h-screen bg-marblewhite dark:bg-backnewsdark pt-6 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Mobile TOC */}
          <div className="lg:hidden mb-2">
            <button
              type="button"
              onClick={() => setIsMobileTOCOpen((v) => !v)}
              className="w-full flex items-center justify-between rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm"
            >
              <span>{t("legal.shipping.title")}</span>
              <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {isMobileTOCOpen
                  ? (t("common.close") ?? "Close")
                  : (t("common.open") ?? "Open")}
              </span>
            </button>

            {isMobileTOCOpen && (
              <nav className="mt-2 space-y-1 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-sm">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleScrollTo(section.id)}
                    className="block w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* Desktop Sidebar / TOC */}
          <aside className="hidden lg:block lg:w-1/4 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 h-max sticky top-24 bg-white/70 dark:bg-neutral-900/80 backdrop-blur">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              {t("legal.shipping.title")}
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
          <main className="lg:w-3/4 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200/70 dark:border-neutral-800 px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-8">
            <header className="border-b border-gray-200 dark:border-neutral-800 pb-4 md:pb-5 mb-4">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-2">
                MindMines
              </p>
              <h1 className="text-2xl md:text-4xl font-extrabold text-backnewsdark dark:text-backnewswhite">
                {t("legal.shipping.title")}
              </h1>
              <p className="text-xs text-gray-500 py-2 dark:text-gray-400">
                <em>{t("legal.lastUpdated", { date: today })}</em>
              </p>
            </header>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="space-y-3 scroll-mt-24"
              >
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
