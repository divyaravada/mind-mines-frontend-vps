import { fmtEUR } from "../lib/money";
import { giftName } from "../features/promos/christmasApi";

export default function ChristmasPromotionSummary({
  quote,
  gifts,
  items,
  locale,
  confirmed = false,
}) {
  if (!quote) return null;
  const de = locale.startsWith("de");
  const gift = gifts.find(({ id }) => id === quote.gift_product_id);
  const vase = items.find(
    (item) => Number(item.productId ?? item.id) === quote.gift_product_id,
  );
  const name =
    giftName(gift, de) || vase?.name || vase?.title || vase?.title_en;
  const discount = Number(quote.promotion_discount);
  return (
    <div
      className="my-3 space-y-1 rounded-lg border border-emerald-700 p-3 text-sm"
      aria-live="polite"
    >
      {quote.gift_product_id && (
        <p>
          {name || (de ? "Gratisartikel" : "Complimentary item")} ·{" "}
          {fmtEUR(0, locale)}
        </p>
      )}
      {discount > 0 && (
        <p>
          {de ? "Weihnachtsrabatt" : "Christmas discount"} · −
          {fmtEUR(discount, locale)}
        </p>
      )}
      {quote.coupon_code && (
        <p>
          {de ? "Gutschein" : "Coupon"} {quote.coupon_code} · −
          {fmtEUR(Number(quote.coupon_discount), locale)}
        </p>
      )}
      <p className="font-semibold">
        {confirmed
          ? de
            ? "Bestätigter Betrag"
            : "Confirmed total"
          : de
            ? "Voraussichtlicher Betrag"
            : "Estimated total"}
        {" · "}
        {fmtEUR(Number(quote.total_before_shipping), locale)}
      </p>
    </div>
  );
}
