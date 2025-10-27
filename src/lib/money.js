// src/lib/money.js
export const toNumberEUR = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "")
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

// Base gross price (incl. 19% VAT)
export const getBaseGross = (p) =>
  toNumberEUR(
    p?.price_gross ??
      p?.vat_price ?? // legacy
      p?.price ?? // legacy (might be net on some APIs, but used as fallback)
      0
  );

// Candidate sale/final gross (incl. VAT)
export const getCandidateSaleGross = (p) =>
  toNumberEUR(p?.sale_price_gross ?? p?.final_price_gross ?? 0);

export const fmtEUR = (n, locale = "en") => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    const x = Number.isFinite(n) ? n : 0;
    return `${x.toFixed(2)} €`;
  }
};

// current sell price (incl. VAT; sale > final > base)
export const resolveProductPrice = (p) =>
  toNumberEUR(
    p?.final_price_gross ??
      p?.sale_price_gross ??
      p?.price_gross ??
      p?.vat_price ?? // legacy
      p?.final_price ?? // legacy
      p?.price ?? // legacy (net sometimes; keep for safety)
      0
  );

// original/base gross (without discount; used for strike-through)
export const resolveBaseGross = (p) =>
  toNumberEUR(p?.price_gross ?? p?.vat_price ?? p?.price ?? 0);

// is discounted?
export const isDiscounted = (p) => {
  const base = getBaseGross(p);
  const sale = getCandidateSaleGross(p);
  return isDiscounted(p) ? sale : base;
};

// VAT amount from gross if your VAT is fixed 19%
export const computeVatAmount = (gross, rate = 0.19) => {
  const net = gross / (1 + rate);
  return gross - net;
};
