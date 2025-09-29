import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { useGetNaturalStonesQuery } from "../features/stones/stonesApi";
import StoneGallery from "../components/StoneGallery";
import StoneEnquiryForm from "../components/StoneEnquiryForm";

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
            <p className="text-gray-700">{rest.join(":").trim()}</p>
          </div>
        );
      }
      return (
        <p key={i} className="text-gray-700 mb-2">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Horizontal selector */}
      <div className="w-full overflow-x-auto">
        <div className="mx-auto flex w-max space-x-4 px-4 py-2">
          {isFetching && !stones.length ? (
            <div className="text-gray-500 py-6">Loading stones…</div>
          ) : stones.length ? (
            stones.map((stone) => {
              const key = `stones.types.${typeKeyFrom(stone.type)}`;
              const label = t(key, stone.type); // fallback to backend value
              return (
                <button
                  key={stone.id}
                  onClick={() => setSelectedStoneId(stone.id)}
                  className={`snap-start flex flex-col items-center min-w-[100px] transition transform hover:scale-105 rounded-xl border bg-white shadow-md px-4 py-3
                    ${
                      selectedStone?.id === stone.id
                        ? "border-blue-500 ring-2 ring-blue-300"
                        : "border-transparent"
                    }`}
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-300 mb-2 shadow-sm">
                    {stone.image ? (
                      <img
                        src={stone.image}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                        No Image
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 uppercase text-center">
                    {label}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-gray-500 py-6">No stones found.</div>
          )}
        </div>
      </div>

      {/* Details */}
      {selectedStone &&
        (() => {
          const typeKey = `stones.types.${typeKeyFrom(selectedStone.type)}`;
          const typeLabel = t(typeKey, selectedStone.type);

          return (
            <div className="mt-20">
              <div className="bg-white p-6 rounded shadow-lg space-y-6 border">
                <h2 className="text-2xl font-semibold mb-4 capitalize">
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
                  />
                ) : (
                  <p className="text-gray-500">
                    No additional images available.
                  </p>
                )}

                {/* Description blocks */}
                {["description", "interest", "key_features", "usage"].map(
                  (field) => (
                    <div key={field}>
                      <h3 className="font-bold text-lg mb-4">
                        {
                          (lang === "de"
                            ? {
                                description: "Beschreibung",
                                interest: "Interessant",
                                key_features: "Hauptmerkmale",
                                usage: "Verwendung",
                              }
                            : {
                                description: "Description",
                                interest: "Why It’s Interesting",
                                key_features: "Key Features",
                                usage: "Usage",
                              })[field]
                        }
                      </h3>
                      <div className="text-gray-700">
                        {renderText(selectedStone, field, lang)}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Enquiry */}
              <div className="bg-gray-50 border rounded p-6 mt-10">
                <h3 className="text-xl font-semibold mb-4">
                  {lang === "de" ? "Anfrage senden" : "Send Enquiry"}
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
  );
}
