// src/lib/i18n.js
export function productTitle(p, locale = "en") {
  return locale === "de"
    ? p.title_de || p.title_en || ""
    : p.title_en || p.title_de || "";
}
