// src/lib/money.js
export function toNumberEUR(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "")
    .replace(/[^\d.,-]/g, "") // keep digits, comma, dot, minus
    .replace(/\.(?=.*\.)/g, "") // keep only last dot if multiple
    .replace(",", "."); // decimal comma -> dot
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function fmtEUR(n, locale = "en") {
  const val = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(val);
  } catch {
    return `${val.toFixed(2)} €`;
  }
}
