// src/lib/pricing.js

// Safe number parse (handles "179", 179, null, undefined)
const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Business rule:
 * - If couponApplied === true  → ignore product discount (use full price_gross / sale_price_gross)
 * - If couponApplied === false → allow product discount (use final_price_gross if present)
 *
 * Your backend fields (from network):
 * price_gross: "179"
 * final_price_gross: "161"   // already discounted
 * sale_price_gross: null     // optional sales price
 * discount_percent: 10
 */
export function resolveUnitGross(item, { couponApplied = false } = {}) {
  const priceGross = n(item?.price_gross ?? item?.price ?? item?.priceGross);
  const saleGross = n(item?.sale_price_gross ?? item?.salePriceGross);
  const finalGross = n(item?.final_price_gross ?? item?.finalPriceGross);

  // Prefer sale price if you ever use it (optional)
  const base = saleGross > 0 ? saleGross : priceGross;

  if (couponApplied) {
    // ✅ coupon overrides product discount
    return base > 0 ? base : finalGross;
  }

  // ✅ no coupon → allow product discount if backend provides it
  if (finalGross > 0) return finalGross;
  return base;
}

export function resolveUnitOriginalGross(item) {
  const priceGross = n(item?.price_gross ?? item?.price ?? item?.priceGross);
  const saleGross = n(item?.sale_price_gross ?? item?.salePriceGross);
  const base = saleGross > 0 ? saleGross : priceGross;
  return base;
}
