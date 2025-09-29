// src/components/LegalMarkdownPage.jsx
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

export default function LegalMarkdownPage({ ns }) {
  // Use default namespace, but prefix all keys with `ns` (privacy/imprint/terms)
  const { t } = useTranslation(undefined, { keyPrefix: ns });

  const title = t("title");
  const updated = t("updated", { defaultValue: "" });

  // Ensure we always get an array, even if the key is missing
  const sectionsRaw = t("sections", { returnObjects: true, defaultValue: [] });
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 prose prose-neutral lg:prose-lg dark:prose-invert  text-backnewswhite dark:text-backnewsdark">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      {!!updated && <p className="text-sm text-gray-500 mb-6">{updated}</p>}

      <div className="space-y-8">
        {sections.map((s, idx) => (
          <section key={idx}>
            {s?.heading && (
              <h2 className="text-xl font-semibold mb-2">{s.heading}</h2>
            )}
            {(s?.body || []).map((p, i) => (
              <p
                key={i}
                className="text-gray-800 dark:text-gray-200 leading-relaxed"
              >
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

LegalMarkdownPage.propTypes = {
  ns: PropTypes.oneOf(["privacy", "imprint", "terms"]).isRequired,
};
