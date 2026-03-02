//src/components/SeoBody.jsx
import { useTranslation } from "react-i18next";

export default function SeoBody({ pageKey }) {
  const { t } = useTranslation();

  const keyH2 = `seoText.${pageKey}.h2`;
  const heading = t(keyH2, { defaultValue: "" });

  // If missing, i18next sometimes returns the key itself — hide section
  if (!heading || heading === keyH2) return null;

  const paras = t(`seoText.${pageKey}.p`, {
    returnObjects: true,
    defaultValue: [],
  });

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-xl md:text-2xl font-semibold mb-4">{heading}</h2>

      {Array.isArray(paras) &&
        paras.map((p, idx) => (
          <p
            key={idx}
            className="text-sm md:text-base leading-7 text-gray-700 mb-3"
          >
            {p}
          </p>
        ))}
    </section>
  );
}
