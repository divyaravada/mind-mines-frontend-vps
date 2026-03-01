// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { isPrerender } from "./utils/isPrerender";

if (!isPrerender) {
  // ✅ normal runtime: load translations from /public/locales
  i18n.use(HttpBackend);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "de"],
    ns: ["translation"],
    defaultNS: "translation",
    debug: false,

    detection: {
      order: [
        "localStorage",
        "cookie",
        "navigator",
        "htmlTag",
        "path",
        "subdomain",
      ],
      caches: ["localStorage"],
    },

    // ✅ only used when HttpBackend is enabled
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    interpolation: { escapeValue: false },
  });

export default i18n;
