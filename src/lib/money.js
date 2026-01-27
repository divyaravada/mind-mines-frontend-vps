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
      p?.price ?? // legacy (might be net on some APIs)
      0,
  );
// Candidate sale/final gross (incl. VAT)
export const resolveProductPrice = (p) =>
  toNumberEUR(
    p?.final_price_gross ??
      p?.sale_price_gross ??
      p?.price_gross ??
      p?.vat_price ?? // legacy
      p?.final_price ?? // legacy
      p?.price ?? // legacy (sometimes net)
      p?.price_gross_display ?? // some APIs
      0,
  );

// Original/base gross used for strike-through
export const resolveBaseGross = (p) => getBaseGross(p);

// ✅ Correct discount check (NO recursion)
export const hasDiscount = (p) => {
  const base = getBaseGross(p);
  const cur = resolveProductPrice(p);
  return base > 0 && cur > 0 && cur < base;
};

export const fmtEUR = (n, locale = "de-DE") => {
  const x = Number.isFinite(n) ? n : toNumberEUR(n);

  // integer euros (drop cents)
  const euros = Math.trunc(x);

  try {
    // format like 1.186 (de-DE uses dot thousands)
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(euros);

    return `${formatted}€`; // ✅ no space before €
  } catch {
    // fallback: 1186 -> "1.186€"
    const formatted = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formatted}€`;
  }
};

// VAT amount from gross if VAT is fixed 19%
export const computeVatAmount = (gross, rate = 0.19) => {
  const net = gross / (1 + rate);
  return gross - net;
};
