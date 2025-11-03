import { api } from "../../services/apiSlice";

/**
 * Accepts:
 *   { code, cart }  where cart = [{ id|product_id, qty }, ...]
 * OR
 *   { code, items } where items = [{ product_id, qty }, ...]
 * We normalize to the backend shape: { code, items }
 */
function normalizeCouponPayload({ code, cart, items }) {
  const normItems = Array.isArray(items)
    ? items
    : Array.isArray(cart)
    ? cart.map((c) => ({
        product_id: c.product_id ?? c.id,
        qty: Number(c.qty) || 1,
      }))
    : [];
  return { code: (code || "").trim(), items: normItems };
}

export const promosApi = api.injectEndpoints({
  endpoints: (build) => ({
    previewCoupon: build.mutation({
      async queryFn(payload, _api, _extra, fetchWithBQ) {
        const body = normalizeCouponPayload(payload || {});
        const res = await fetchWithBQ({
          url: "coupons/preview/",
          method: "POST",
          body,
        });
        if (res.error) return { error: res.error };
        return { data: res.data ?? {} };
      },
    }),
    getActivePromotion: build.query({
      query: () => "promotions/active/",
      transformResponse: (res) => res || {},
      providesTags: ["Promos"],
    }),
  }),
});

export const { usePreviewCouponMutation, useGetActivePromotionQuery } =
  promosApi;
