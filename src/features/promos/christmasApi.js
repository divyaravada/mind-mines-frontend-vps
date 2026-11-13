import { api } from "../../services/apiSlice";

export const christmasUiEnabled =
  process.env.REACT_APP_CHRISTMAS_CHECKOUT === "true";

const christmasApi = api.injectEndpoints({
  endpoints: (build) => ({
    christmasGifts: build.query({
      query: () => "promotions/christmas/gifts/",
    }),
    christmasQuote: build.query({
      query: (body) => ({
        url: "promotions/christmas/quote/",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useChristmasGiftsQuery, useChristmasQuoteQuery } = christmasApi;

export function useChristmasCatalogue() {
  const { currentData, isError } = useChristmasGiftsQuery(undefined, {
    skip: !christmasUiEnabled,
    refetchOnMountOrArgChange: 60,
    pollingInterval: christmasUiEnabled ? 60000 : 0,
  });
  return {
    enabled:
      !isError &&
      currentData?.active === true &&
      currentData?.checkout_enabled === true,
    gifts: currentData?.products ?? [],
  };
}

export function giftName(gift, de) {
  return (
    (de
      ? gift?.title_de || gift?.title_en
      : gift?.title_en || gift?.title_de) || ""
  );
}

const giftKey = "mindmines_christmas_gift";

export function readChristmasGift() {
  try {
    return Number(window.sessionStorage.getItem(giftKey)) || null;
  } catch {
    return null;
  }
}

export function rememberChristmasGift(id) {
  try {
    if (id == null) window.sessionStorage.removeItem(giftKey);
    else window.sessionStorage.setItem(giftKey, String(id));
  } catch {
    // Checkout still works if storage is unavailable.
  }
}

export function checkoutPromotion(quote, giftId) {
  if (!quote?.offer_code && !quote?.coupon_code) return undefined;
  return {
    gift_product_id: giftId,
    expected_total: quote.total_before_shipping,
    expected_offer: quote.offer_code ?? null,
    expected_gift_id: quote.gift_product_id ?? null,
  };
}
