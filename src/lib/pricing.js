// src/lib/pricing.js

export function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n) {
  return Number(toNum(n).toFixed(2));
}

// Detect product discount
export function isProductDiscounted(item) {
  const pct =
    toNum(item?.discount_percent ?? item?.product_discount_percent) || 0;

  return Boolean(item?.is_discounted) || pct > 0;
}

/**
 * Pick original and discounted unit gross prices from item.
 * - original gross: price_gross / priceGross / price_gross_amount
 * - discounted gross: final_price_gross / finalPriceGross
 * fallback: item.price / item.priceRange
 */
export function resolveUnitPrices(item) {
  const originalGross = toNum(
    item?.price_gross ?? item?.priceGross ?? item?.price_gross_amount,
  );

  const discountedGross = toNum(
    item?.final_price_gross ?? item?.finalPriceGross,
  );

  const fallback = toNum(item?.price ?? item?.priceRange);

  return {
    originalGross: originalGross > 0 ? originalGross : fallback,
    discountedGross:
      discountedGross > 0
        ? discountedGross
        : originalGross > 0
          ? originalGross
          : fallback,
  };
}

/**
 * Main helper:
 * Returns a full breakdown for ONE cart line (unit + qty).
 *
 * Business rule supported:
 * - If coupon is applied -> coupon uses ORIGINAL price (product discount removed)
 * - Else -> product discount applies (if any)
 *
 * Coupon can be:
 * - percent coupon (e.g. 25%) via couponPercent
 * - fixed amount coupon (money) via couponAmountGross
 *
 * If your backend returns total discount amount for entire cart:
 * - you can pass `couponAmountGross` only at cart-level (not per-line)
 * - or distribute per-line later (optional)
 */
export function computeLinePricing(item, opts = {}) {
  const qty = Math.max(1, toNum(item?.qty) || 1);

  const { originalGross, discountedGross } = resolveUnitPrices(item);
  const hasProd = isProductDiscounted(item);

  const couponApplied = Boolean(opts?.couponApplied);
  const couponPercent = Math.max(0, toNum(opts?.couponPercent)); // e.g. 25
  const couponAmountGross = Math.max(0, toNum(opts?.couponAmountGross)); // fixed € discount per LINE (optional)

  // Step A: choose base unit price (this is what user starts from)
  const unitBaseGross = couponApplied
    ? originalGross // coupon overrides product discount
    : hasProd
      ? discountedGross
      : originalGross;

  // Step B: product discount amount (only if coupon is NOT applied)
  const unitProductDiscountGross =
    !couponApplied && hasProd
      ? Math.max(0, round2(originalGross - discountedGross))
      : 0;

  // Step C: coupon discount amount (applies on base = original if couponApplied)
  // percent coupon -> computed per unit
  const unitCouponDiscountFromPercent =
    couponApplied && couponPercent > 0
      ? round2((originalGross * couponPercent) / 100)
      : 0;

  // fixed coupon per unit (rare). If you pass per-line, divide by qty.
  const unitCouponDiscountFromAmount =
    couponApplied && couponAmountGross > 0
      ? round2(couponAmountGross / qty)
      : 0;

  const unitCouponDiscountGross = round2(
    unitCouponDiscountFromPercent + unitCouponDiscountFromAmount,
  );

  // Final
  const unitFinalGross = round2(
    Math.max(0, unitBaseGross - unitCouponDiscountGross),
  );
  const lineFinalGross = round2(unitFinalGross * qty);

  // Helpful totals
  const lineOriginalGross = round2(originalGross * qty);
  const lineProductDiscountGross = round2(unitProductDiscountGross * qty);
  const lineCouponDiscountGross = round2(unitCouponDiscountGross * qty);

  // A user-facing explanation (you can show each line)
  const explain = [];

  explain.push({ label: "Original", value: originalGross });
  if (!couponApplied && hasProd) {
    explain.push({
      label: "Product discount",
      value: -unitProductDiscountGross,
      note: `(${round2((unitProductDiscountGross / originalGross) * 100)}% off)`,
    });
  }
  if (couponApplied) {
    explain.push({
      label: "Coupon base",
      value: originalGross,
      note: "Product discount removed",
    });
    if (couponPercent > 0)
      explain.push({
        label: `Coupon (${couponPercent}%)`,
        value: -unitCouponDiscountFromPercent,
      });
    if (unitCouponDiscountFromAmount > 0)
      explain.push({
        label: "Coupon (fixed)",
        value: -unitCouponDiscountFromAmount,
      });
  }
  explain.push({ label: "Final unit", value: unitFinalGross });

  return {
    qty,

    originalGross,
    discountedGross,
    hasProd,

    couponApplied,
    couponPercent,
    couponAmountGross,

    unitBaseGross,
    unitProductDiscountGross,
    unitCouponDiscountGross,
    unitFinalGross,

    lineOriginalGross,
    lineProductDiscountGross,
    lineCouponDiscountGross,
    lineFinalGross,

    explain,
  };
}

/**
 * Keep your old function, but make it use computeLinePricing
 * so you don’t have 2 price systems.
 */
export function resolveUnitGross(item, { couponApplied = false } = {}) {
  const r = computeLinePricing(item, { couponApplied });
  return r.unitBaseGross; // base (before coupon) for cart; or adapt if needed
}
