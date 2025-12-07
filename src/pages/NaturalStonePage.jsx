// src/pages/NaturalStonePage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { useGetNaturalStonesQuery } from "../features/stones/stonesApi";
import StoneGallery from "../components/StoneGallery";
import StoneEnquiryForm from "../components/StoneEnquiryForm";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

// helper to turn "Travertine" -> "travertine", "Natural Stone" -> "natural_stone"
const typeKeyFrom = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z]+/g, "_") // spaces, hyphens -> _
    .replace(/^_+|_+$/g, ""); // trim _

export default function NaturalStonesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const { data: stones = [], isFetching } = useGetNaturalStonesQuery();
  const [selectedStoneId, setSelectedStoneId] = useState(null);

  const [trackEvent] = useTrackEventMutation();
  const track = useCallback(
    (payload) => {
      try {
        trackEvent(payload);
      } catch {
        /* ignore tracking failures */
      }
    },
    [trackEvent]
  );

  const sectionLabels = useMemo(
    () => ({
      description: t("naturalStone.sections.description"),
      interest: t("naturalStone.sections.interest"),
      key_features: t("naturalStone.sections.keyFeatures"),
      usage: t("naturalStone.sections.usage"),
    }),
    [t]
  );

  const selectedStone = useMemo(() => {
    if (!stones.length) return null;
    const chosen = stones.find((s) => s.id === selectedStoneId);
    return chosen || stones[0];
  }, [stones, selectedStoneId]);

  useEffect(() => {
    if (!selectedStoneId && stones.length) {
      setSelectedStoneId(stones[0].id);
    }
  }, [stones, selectedStoneId]);

  // 🔹 Track natural stone page views once stones are loaded
  useEffect(() => {
    if (!stones || !stones.length) return;
    const types = Array.from(
      new Set(stones.map((s) => s.type).filter(Boolean))
    );
    track({
      event_type: "natural_stone_page_view",
      stone_count: stones.length,
      types,
    });
  }, [stones, track]);

  const renderText = (stone, field, langCode /* "en"|"de" */) => {
    if (!stone) return null;
    const key = `${field}_${langCode}`;
    const content = stone[key] || "";
    const lines = content
      .split("\r\n")
      .map((s) => s.trim())
      .filter(Boolean);

    return lines.map((line, i) => {
      const [title, ...rest] = line.split(":");
      if (rest.length) {
        return (
          <div key={i} className="mb-1">
            <p className="font-semibold">{title.trim()}:</p>
            <p className="text-gray-700 dark:text-gray-300">
              {rest.join(":").trim()}
            </p>
          </div>
        );
      }
      return (
        <p key={i} className="text-gray-700 dark:text-gray-300 mb-2">
          {line}
        </p>
      );
    });
  };

  // 🔹 SEO helpers
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://mindmines.eu";

  const pageTitle = t(
    "naturalStone.meta.title",
    "Natural Stone, Marble & Granite – MindMines"
  );
  const pageDesc = t(
    "naturalStone.meta.description",
    "Explore premium marble, granite, travertine and other natural stones for countertops, flooring, bathrooms and custom projects."
  );
  const canonUrl = `${currentOrigin}/natural-stone`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: currentOrigin },
      {
        "@type": "ListItem",
        position: 2,
        name: lang === "de" ? "Naturstein" : "Natural Stone",
        item: canonUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonUrl} />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Horizontal selector */}
        <div className="w-full overflow-x-auto">
          <div className="mx-auto flex w-max space-x-4 px-4 py-2">
            {isFetching && !stones.length ? (
              <div className="text-gray-500 py-6">
                {t("naturalStone.loading")}
              </div>
            ) : stones.length ? (
              stones.map((stone) => {
                const key = `stones.types.${typeKeyFrom(stone.type)}`;
                const label = t(key, stone.type);
                const active = selectedStone?.id === stone.id;
                return (
                  <button
                    key={stone.id}
                    onClick={() => {
                      setSelectedStoneId(stone.id);
                      track({
                        event_type: "stone_type_select",
                        stone_id: stone.id,
                        type: stone.type,
                      });
                    }}
                    className={`snap-start flex flex-col items-center min-w-[100px] transition transform hover:scale-105 rounded-xl border px-4 py-3
                      bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-black/5 dark:ring-white/5
                      ${
                        active
                          ? "border-backnewswhite ring-2 ring-backnewswhite/60"
                          : "border-transparent"
                      }`}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-300 dark:border-neutral-700 mb-2 shadow-sm">
                      {stone.image ? (
                        <img
                          src={stone.image}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-xs text-gray-500">
                          {t("naturalStone.noImage")}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase text-center">
                      {label}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="text-gray-500 py-6">
                {t("naturalStone.noResults")}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        {selectedStone &&
          (() => {
            const typeKey = `stones.types.${typeKeyFrom(selectedStone.type)}`;
            const typeLabel = t(typeKey, selectedStone.type);

            return (
              <div className="mt-12 md:mt-16">
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 space-y-6">
                  <h2 className="text-2xl font-semibold mb-2 capitalize text-marbleblack dark:text-white">
                    {typeLabel}
                  </h2>

                  {/* Gallery */}
                  {selectedStone.images?.length > 0 || selectedStone.image ? (
                    <StoneGallery
                      images={[
                        ...(selectedStone.image ? [selectedStone.image] : []),
                        ...(selectedStone.images || []).map((img) => img.image),
                      ]}
                      stoneType={typeLabel}
                      stoneId={selectedStone.id}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      {t("naturalStone.noExtraImages")}
                    </p>
                  )}

                  {/* Description blocks */}
                  {["description", "interest", "key_features", "usage"].map(
                    (field) => (
                      <div key={field}>
                        <h3 className="font-bold text-lg mb-3 text-marbleblack dark:text-white">
                          {sectionLabels[field] || ""}
                        </h3>
                        <div className="text-gray-700 dark:text-gray-300">
                          {renderText(selectedStone, field, lang)}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Enquiry */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl p-6 mt-10 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 text-marbleblack dark:text-white">
                    {t("naturalStone.sendEnquiry")}
                  </h3>
                  <StoneEnquiryForm
                    isAuthenticated={isAuthenticated}
                    presetStoneType={typeLabel}
                    onSuccess={() =>
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                  />
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
