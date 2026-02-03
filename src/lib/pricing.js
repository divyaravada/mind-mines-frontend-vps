// src/lib/pricing.js

export function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Business rule:
 * - If couponApplied: use original gross price (price_gross)
 * - Else: if product discounted: use discounted gross price (final_price_gross)
 * - Fallback: item.price / priceRange
 */
export function resolveUnitGross(item, { couponApplied = false } = {}) {
  const priceGross = toNum(
    item?.price_gross ?? item?.priceGross ?? item?.price_gross_amount,
  );
  const finalGross = toNum(item?.final_price_gross ?? item?.finalPriceGross);

  const isDiscounted =
    Boolean(item?.is_discounted) ||
    toNum(item?.discount_percent ?? item?.product_discount_percent) > 0;

  if (couponApplied) {
    // coupon overrides product discount
    return priceGross > 0 ? priceGross : toNum(item?.price ?? item?.priceRange);
  }

  if (isDiscounted && finalGross > 0) return finalGross;

  return priceGross > 0 ? priceGross : toNum(item?.price ?? item?.priceRange);
}
